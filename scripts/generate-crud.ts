#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Parse Prisma schema to extract model
function parsePrismaModel(schemaPath: string, modelName: string) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Find the model block
  const modelRegex = new RegExp(
    `model\\s+${modelName}\\s*\\{([\\s\\S]+?)\\}`,
    ''
  );
  const match = schemaContent.match(modelRegex);

  if (!match) {
    throw new Error(`Model "${modelName}" not found in Prisma schema`);
  }

  const modelBody = match[1];
  const fields: Array<{
    name: string;
    type: string;
    optional: boolean;
    array: boolean;
    relation?: boolean;
    default?: string;
    map?: string;
    label: string;
  }> = [];

  // Parse fields line by line to avoid regex issues with @unique and other attributes
  const lines = modelBody.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and model-level directives (starting with @@)
    if (!trimmedLine || trimmedLine.startsWith('@@')) {
      continue;
    }

    // Match field definition: fieldName Type? @attributes
    // This regex matches: word (field name), whitespace, word (type), optional ?, rest of line (attributes)
    const fieldMatch = trimmedLine.match(/^(\w+)\s+(\w+(?:\[\])?)\s*(\?)?\s*(.*)$/);
    
    if (!fieldMatch) {
      continue;
    }

    const [, name, type, optional, attributes] = fieldMatch;

    // Skip relations (they have @relation)
    if (attributes.includes('@relation')) {
      continue;
    }

    // Skip id, createdAt, updatedAt for forms (but include in table)
    const isSystemField = ['id', 'createdAt', 'updatedAt'].includes(name);

    const isArray = type.endsWith('[]');
    const baseType = isArray ? type.slice(0, -2) : type;
    const isOptional = optional === '?';

    // Extract default value
    const defaultMatch = attributes.match(/@default\(([^)]+)\)/);
    const defaultValue = defaultMatch ? defaultMatch[1] : undefined;

    // Extract @map
    const mapMatch = attributes.match(/@map\("([^"]+)"\)/);
    const mapName = mapMatch ? mapMatch[1] : undefined;

    // Generate label from field name
    const label = name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

    fields.push({
      name,
      type: baseType,
      optional: isOptional || isSystemField,
      array: isArray,
      default: defaultValue,
      map: mapName,
      label,
    });
  }

  return {
    name: modelName,
    fields,
  };
}

// Map Prisma types to Zod types
function prismaToZodType(field: { type: string; optional: boolean; default?: string }) {
  const { type, optional, default: defaultValue } = field;

  let zodType = '';

  switch (type) {
    case 'String':
      zodType = 'z.string()';
      if (defaultValue) {
        zodType += `.default(${defaultValue})`;
      } else if (!optional) {
        zodType += '.min(1, "This field is required")';
      } else {
        // For optional strings, allow empty string and transform to undefined
        zodType += '.optional().or(z.literal(""))';
      }
      break;
    case 'Int':
    case 'Float':
      zodType = 'z.number()';
      if (defaultValue) {
        zodType += `.default(${defaultValue})`;
      }
      break;
    case 'Boolean':
      zodType = 'z.boolean()';
      if (defaultValue) {
        zodType += `.default(${defaultValue === 'true'})`;
      }
      break;
    case 'DateTime':
      zodType = 'z.coerce.date()';
      break;
    case 'Json':
      zodType = 'z.any()';
      break;
    default:
      zodType = 'z.string()';
  }

  // Only add .optional() if not already added (for String type with optional)
  if (optional && !defaultValue && type !== 'String') {
    zodType += '.optional()';
  }

  return zodType;
}

// Map Prisma types to form components
function getFormComponent(field: { type: string; name: string }) {
  const { type, name } = field;

  if (type === 'Boolean') {
    return 'Checkbox';
  }
  if (name.toLowerCase().includes('email')) {
    return 'Input (type="email")';
  }
  if (name.toLowerCase().includes('description') || name.toLowerCase().includes('notes')) {
    return 'Textarea';
  }
  if (type === 'DateTime') {
    return 'Input (type="datetime-local")';
  }
  if (type === 'Int' || type === 'Float') {
    return 'Input (type="number")';
  }

  return 'Input';
}

// Generate schema file
function generateSchema(model: ReturnType<typeof parsePrismaModel>) {
  const formFields = model.fields.filter(f => !['id', 'createdAt', 'updatedAt'].includes(f.name));

  const zodFields = formFields.map(field => {
    const zodType = prismaToZodType(field);
    return `  ${field.name}: ${zodType},`;
  }).join('\n');

  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);

  return `import { z } from "zod";

export const ${modelCamel}Schema = z.object({
${zodFields}
});

export type ${modelName}Input = z.infer<typeof ${modelCamel}Schema>;
`;
}

// Generate API client file
function generateAPI(model: ReturnType<typeof parsePrismaModel>) {
  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const plural = modelCamel + 's';
  const apiPath = `/api/${plural}`;

  return `import { fetcher } from "@/lib/fetcher";
import { ${modelName}Input } from "./schema";

export const ${plural}Api = {
  getAll: () => fetcher("${apiPath}"),
  create: async (data: ${modelName}Input) => {
    const response = await fetch("${apiPath}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to create ${modelCamel}";
      try {
        // Read response as text first, then try to parse as JSON
        const text = await response.text();
        try {
          const error = JSON.parse(text);
          errorMessage = error.message || error.error || errorMessage;
        } catch {
          // If not valid JSON, use the text as error message
          errorMessage = text || errorMessage;
        }
      } catch (e) {
        // Fallback if reading response fails
        errorMessage = errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    return response.json();
  },
  update: async (id: number, data: ${modelName}Input) => {
    const response = await fetch(\`${apiPath}/\${id}\`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to update ${modelCamel}";
      try {
        // Read response as text first, then try to parse as JSON
        const text = await response.text();
        try {
          const error = JSON.parse(text);
          errorMessage = error.message || error.error || errorMessage;
        } catch {
          // If not valid JSON, use the text as error message
          errorMessage = text || errorMessage;
        }
      } catch (e) {
        // Fallback if reading response fails
        errorMessage = errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    return response.json();
  },
  delete: (id: number) =>
    fetch(\`${apiPath}/\${id}\`, {
      method: "DELETE",
    }).then((r) => r.json()),
};
`;
}

// Generate hooks file
function generateHooks(model: ReturnType<typeof parsePrismaModel>) {
  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const plural = modelCamel + 's';

  return `"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ${plural}Api } from "./api";
import { ${modelName}Input } from "./schema";

export const use${modelName}s = () => {
  return useQuery({
    queryKey: ["${plural}"],
    queryFn: () => ${plural}Api.getAll(),
  });
};

export const useCreate${modelName} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ${modelName}Input) => ${plural}Api.create(data),
    onSuccess: async (new${modelName}) => {
      // Optimistically update the cache for immediate UI feedback
      queryClient.setQueryData<any[]>(["${plural}"], (old) => {
        if (!old) return [new${modelName}];
        return [new${modelName}, ...old];
      });
      // Invalidate and refetch to ensure we have the latest data from server
      await queryClient.invalidateQueries({ queryKey: ["${plural}"] });
      // Force refetch to update the UI
      await queryClient.refetchQueries({ queryKey: ["${plural}"] });
    },
  });
};

export const useUpdate${modelName} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ${modelName}Input }) =>
      ${plural}Api.update(id, data),
    onSuccess: async (updated${modelName}) => {
      // Optimistically update the cache for immediate UI feedback
      queryClient.setQueryData<any[]>(["${plural}"], (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === updated${modelName}.id ? updated${modelName} : item));
      });
      // Invalidate and refetch to ensure we have the latest data from server
      await queryClient.invalidateQueries({ queryKey: ["${plural}"] });
      // Force refetch to update the UI
      await queryClient.refetchQueries({ queryKey: ["${plural}"] });
    },
  });
};

export const useDelete${modelName} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ${plural}Api.delete(id),
    onSuccess: async () => {
      // Invalidate and refetch to ensure we have the latest data from server
      await queryClient.invalidateQueries({ queryKey: ["${plural}"] });
      // Force refetch to update the UI
      await queryClient.refetchQueries({ queryKey: ["${plural}"] });
    },
  });
};
`;
}

// Generate form component
function generateFormComponent(model: ReturnType<typeof parsePrismaModel>) {
  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const formFields = model.fields.filter(f => !['id', 'createdAt', 'updatedAt'].includes(f.name));
  
  const fieldComponents = formFields.map(field => {
    const fieldName = field.name;
    const fieldLabel = field.label;
    const fieldId = `${modelCamel}-form-${fieldName}`;
    
    let component = '';
    
    if (field.type === 'Boolean') {
      component = `<Controller
            name="${fieldName}"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="${fieldId}"
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldLabel htmlFor="${fieldId}">${fieldLabel}</FieldLabel>
                </div>
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />`;
    } else if (fieldName.toLowerCase().includes('email')) {
      component = `<Controller
            name="${fieldName}"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="${fieldId}">${fieldLabel}</FieldLabel>
                <Input
                  {...formField}
                  id="${fieldId}"
                  type="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="${fieldLabel.toLowerCase()}"
                  autoComplete="off"
                />
                <FieldDescription>
                  Enter a valid email address.
                </FieldDescription>
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />`;
    } else if (fieldName.toLowerCase().includes('description') || fieldName.toLowerCase().includes('notes')) {
      component = `<Controller
            name="${fieldName}"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="${fieldId}">${fieldLabel}</FieldLabel>
                <Textarea
                  {...formField}
                  id="${fieldId}"
                  aria-invalid={fieldState.invalid}
                  placeholder="${fieldLabel.toLowerCase()}"
                  rows={4}
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />`;
    } else if (field.type === 'Int' || field.type === 'Float') {
      component = `<Controller
            name="${fieldName}"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="${fieldId}">${fieldLabel}</FieldLabel>
                <Input
                  {...formField}
                  id="${fieldId}"
                  type="number"
                  aria-invalid={fieldState.invalid}
                  placeholder="${fieldLabel.toLowerCase()}"
                  autoComplete="off"
                  onChange={(e) => formField.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />`;
    } else {
      component = `<Controller
            name="${fieldName}"
            control={form.control}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="${fieldId}">${fieldLabel}</FieldLabel>
                <Input
                  {...formField}
                  id="${fieldId}"
                  aria-invalid={fieldState.invalid}
                  placeholder="${fieldLabel.toLowerCase()}"
                  autoComplete="off"
                />
                {fieldState.invalid && fieldState.error && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />`;
    }
    
    return component;
  }).join('\n\n          ');

  const defaultValues = formFields.map(field => {
    if (field.type === 'Boolean') {
      return `      ${field.name}: ${modelCamel}?.${field.name} ?? ${field.default === 'true' ? 'true' : 'false'},`;
    } else if (field.type === 'Int' || field.type === 'Float') {
      return `      ${field.name}: ${modelCamel}?.${field.name} ?? ${field.default || '0'},`;
    } else {
      return `      ${field.name}: ${modelCamel}?.${field.name} ?? ${field.default ? `"${field.default.replace(/"/g, '')}"` : '""'},`;
    }
  }).join('\n');

  const resetValues = formFields.map(f => {
    if (f.type === 'Boolean') {
      return `        ${f.name}: ${f.default === 'true' ? 'true' : 'false'},`;
    } else if (f.type === 'Int' || f.type === 'Float') {
      return `        ${f.name}: ${f.default || '0'},`;
    } else {
      return `        ${f.name}: ${f.default ? `"${f.default.replace(/"/g, '')}"` : '""'},`;
    }
  }).join('\n');

  const resetEditValues = formFields.map(f => {
    if (f.type === 'Boolean') {
      return `        ${f.name}: ${modelCamel}.${f.name} ?? ${f.default === 'true' ? 'true' : 'false'},`;
    } else if (f.type === 'Int' || f.type === 'Float') {
      return `        ${f.name}: ${modelCamel}.${f.name} ?? ${f.default || '0'},`;
    } else {
      return `        ${f.name}: ${modelCamel}.${f.name} ?? ${f.default ? `"${f.default.replace(/"/g, '')}"` : '""'},`;
    }
  }).join('\n');

  // Build transformation code for empty strings to undefined
  const optionalStringFields = formFields.filter(f => f.type === 'String' && f.optional);
  const transformFields = optionalStringFields.map(f => 
    `        ${f.name}: data.${f.name} === "" ? undefined : data.${f.name},`
  ).join('\n');
  
  const transformCode = optionalStringFields.length > 0 
    ? `      // Transform empty strings to undefined for optional fields
      const submitData = {
        ...data,${transformFields ? '\n' + transformFields : ''}
      };`
    : `      const submitData = data;`;

  return `"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ${modelCamel}Schema, type ${modelName}Input } from "@/features/${model.name.toLowerCase()}s/schema";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldOrientation,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreate${modelName}, useUpdate${modelName} } from "@/features/${model.name.toLowerCase()}s/hooks";

type ${modelName} = {
  id: number;
${model.fields.filter(f => f.name !== 'id').map(f => {
  if (f.type === 'DateTime') {
    return `  ${f.name}: Date | null;`;
  } else if (f.type === 'Boolean') {
    return `  ${f.name}: boolean;`;
  } else if (f.type === 'Int' || f.type === 'Float') {
    return `  ${f.name}: number;`;
  } else {
    return `  ${f.name}: string | null;`;
  }
}).join('\n')}
};

interface ${modelName}FormProps {
  ${modelCamel}?: ${modelName} | null;
  onSuccess?: () => void;
}

export const ${modelName}Form = ({ ${modelCamel}, onSuccess }: ${modelName}FormProps) => {
  const create${modelName} = useCreate${modelName}();
  const update${modelName} = useUpdate${modelName}();
  const isEditMode = !!${modelCamel};

  const form = useForm<${modelName}Input>({
    resolver: zodResolver(${modelCamel}Schema),
    defaultValues: {
${defaultValues}
    },
  });

  // Reset form when ${modelCamel} changes
  React.useEffect(() => {
    if (${modelCamel}) {
      form.reset({
${resetEditValues}
      });
    } else {
      form.reset({
${resetValues}
      });
    }
  }, [${modelCamel}, form]);

  const onSubmit = async (data: ${modelName}Input) => {
    try {
      console.log("Form submitted with data:", data);
      
${transformCode}
      
      console.log("Submitting transformed data:", submitData);
      
      if (isEditMode && ${modelCamel}) {
        const result = await update${modelName}.mutateAsync({ id: ${modelCamel}.id, data: submitData });
        console.log("Update result:", result);
        if (!result || !result.id) {
          throw new Error("${modelName} was not updated. No ID returned.");
        }
        toast.success("${modelName} updated successfully", {
          description: \`${modelName} has been updated.\`,
        });
      } else {
        const result = await create${modelName}.mutateAsync(submitData);
        console.log("Create result:", result);
        if (!result || !result.id) {
          throw new Error("${modelName} was not created. No ID returned.");
        }
        toast.success("${modelName} created successfully", {
          description: \`${modelName} has been added.\`,
        });
      }
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("${modelName} form submission error:", error);
      
      let errorMessage = "An error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      if (errorMessage.includes("403") || errorMessage.includes("Forbidden") || errorMessage.includes("permission")) {
        toast.error("Permission Denied", {
          description: \`You don't have permission to \${isEditMode ? 'update' : 'create'} ${model.name.toLowerCase()}s.\`,
        });
      } else {
        toast.error(isEditMode ? "Failed to update ${modelName.toLowerCase()}" : "Failed to create ${modelName.toLowerCase()}", {
          description: errorMessage,
        });
      }
    }
  };

  const isLoading = create${modelName}.isPending || update${modelName}.isPending;

  return (
    <div className="w-full space-y-6">
      <form id="${modelCamel}-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldGroup>
          ${fieldComponents}
        </FieldGroup>
      </form>
      <FieldOrientation orientation="horizontal" className="w-full justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button 
          type="submit" 
          form="${modelCamel}-form" 
          disabled={isLoading} 
          variant="default"
          style={{ 
            backgroundColor: 'hsl(var(--primary))', 
            color: 'hsl(var(--primary-foreground))' 
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.9)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
            }
          }}
        >
          {isLoading 
            ? (isEditMode ? "Updating..." : "Creating...") 
            : (isEditMode ? "Update ${modelName}" : "Create ${modelName}")}
        </Button>
      </FieldOrientation>
    </div>
  );
};
`;
}

// Generate table component
function generateTableComponent(model: ReturnType<typeof parsePrismaModel>) {
  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const plural = modelCamel + 's';
  const displayFields = model.fields.filter(f => f.name !== 'id' && f.name !== 'updatedAt');
  const mainFields = displayFields.filter(f => f.name !== 'createdAt');
  const filterField = mainFields.find(f => f.type === 'String')?.name || mainFields[0]?.name || 'name';
  
  const columns = mainFields.map(field => {
    const fieldName = field.name;
    const fieldLabel = field.label;
    let cellRender = `<div>{row.getValue("${fieldName}") || "-"}</div>`;
    if (field.type === 'Boolean') {
      cellRender = `<div className="capitalize">{row.getValue("${fieldName}") ? "Yes" : "No"}</div>`;
    } else if (fieldName.toLowerCase().includes('email')) {
      cellRender = `<div className="lowercase">{row.getValue("${fieldName}") || "-"}</div>`;
    } else if (field.type === 'Int' || field.type === 'Float') {
      cellRender = `<div>{row.getValue("${fieldName}") ?? 0}</div>`;
    }
    return `    {
      accessorKey: "${fieldName}",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2 lg:px-3">
          ${fieldLabel} <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => ${cellRender},
    },`;
  }).join('\n');

  const createdAtColumn = model.fields.find(f => f.name === 'createdAt') 
    ? `    { accessorKey: "createdAt", header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2 lg:px-3">
          Created At <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ), cell: ({ row }) => {
        const date = row.getValue("createdAt") as Date | null;
        return <div>{date ? new Date(date).toLocaleDateString() : "-"}</div>;
      } },`
    : '';

  const typeDef = `type ${modelName} = {
  id: number;
${model.fields.filter(f => f.name !== 'id').map(f => {
    if (f.type === 'DateTime') return `  ${f.name}: Date | null;`;
    if (f.type === 'Boolean') return `  ${f.name}: boolean;`;
    if (f.type === 'Int' || f.type === 'Float') return `  ${f.name}: number;`;
    return `  ${f.name}: string | null;`;
  }).join('\n')}
};`;

  return `"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAbility } from "@/lib/authorization";

${typeDef}

interface ${modelName}sTableProps {
  data: ${modelName}[];
  onDelete?: (id: number) => void;
  onEdit?: (${modelCamel}: ${modelName}) => void;
  onView?: (${modelCamel}: ${modelName}) => void;
  onBulkDelete?: (ids: number[]) => void;
}

export const ${modelName}sTable = ({ data, onDelete, onEdit, onView, onBulkDelete }: ${modelName}sTableProps) => {
  const ability = useAbility();
  const canUpdate = (ability as any).can("update", "${modelName}");
  const canDelete = (ability as any).can("delete", "${modelName}");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns: ColumnDef<${modelName}>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
${columns}
${createdAtColumn}
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const ${modelCamel} = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(String(${modelCamel}.id))}
              >
                Copy ${modelName} ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView?.(${modelCamel})}>
                View ${modelName.toLowerCase()}
              </DropdownMenuItem>
              {canUpdate && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(${modelCamel})}>
                  Edit ${modelName.toLowerCase()}
                </DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(${modelCamel}.id)}
                  >
                    Delete ${modelName.toLowerCase()}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedIds = table.getFilteredSelectedRowModel().rows.map((row) => row.original.id);

  const handleBulkDelete = () => {
    if (selectedIds.length > 0 && onBulkDelete) {
      if (confirm(\`Are you sure you want to delete \${selectedIds.length} ${modelName.toLowerCase()}(s)?\`)) {
        onBulkDelete(selectedIds);
        setRowSelection({});
      }
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2 flex-wrap">
        <Input
          placeholder={\`Filter ${filterField}...\`}
          value={(table.getColumn("${filterField}")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("${filterField}")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        {selectedIds.length > 0 && onBulkDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            Delete Selected ({selectedIds.length})
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4 flex-wrap gap-2">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
`;
}

// Generate page component
function generatePageComponent(model: ReturnType<typeof parsePrismaModel>) {
  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const plural = modelCamel + 's';
  const capitalized = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();
  
  const typeDef = `type ${modelName} = {
  id: number;
${model.fields.filter(f => f.name !== 'id').map(f => {
    if (f.type === 'DateTime') return `  ${f.name}: Date | null;`;
    if (f.type === 'Boolean') return `  ${f.name}: boolean;`;
    if (f.type === 'Int' || f.type === 'Float') return `  ${f.name}: number;`;
    return `  ${f.name}: string | null;`;
  }).join('\n')}
};`;

  const viewFields = model.fields.filter(f => f.name !== 'id').map(f => {
    const fieldName = f.name;
    const fieldLabel = f.label;
    let valueRender = `{selected${modelName}.${fieldName}}`;
    if (f.type === 'DateTime') valueRender = `{selected${modelName}.${fieldName} ? new Date(selected${modelName}.${fieldName}).toLocaleString() : "N/A"}`;
    if (f.type === 'Boolean') valueRender = `{selected${modelName}.${fieldName} ? "Yes" : "No"}`;
    return `              <div>
                <label className="text-sm font-medium text-muted-foreground">${fieldLabel}</label>
                <p className="text-sm mt-1">${valueRender}</p>
              </div>`;
  }).join('\n');

  return `"use client";

import { useState } from "react";
import { use${modelName}s, useDelete${modelName} } from "@/features/${plural}/hooks";
import { ${modelName}sTable } from "./${modelCamel}-table";
import { ${modelName}Form } from "./${modelCamel}-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetHeader, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAbility } from "@/lib/authorization";
import { useConfirmDialogStore } from "@/store/confirm-dialog-store";

${typeDef}

export default function ${modelName}sPage() {
  const { data = [], isLoading } = use${modelName}s();
  const delete${modelName} = useDelete${modelName}();
  const ability = useAbility();
  const [formOpen, setFormOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selected${modelName}, setSelected${modelName}] = useState<${modelName} | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const canCreate = (ability as any).can("create", "${modelName}");
  const canUpdate = (ability as any).can("update", "${modelName}");
  const canDelete = (ability as any).can("delete", "${modelName}");

  const confirmDialog = useConfirmDialogStore();

  const handleDelete = async (id: number) => {
    confirmDialog.openDialog({
      title: "Delete ${modelName}",
      description: "Are you sure you want to delete this ${modelName.toLowerCase()}? This action cannot be undone.",
      variant: "destructive",
      okLabel: "Delete",
      onConfirm: async () => {
        try {
          await delete${modelName}.mutateAsync(id);
          toast.success("${modelName} deleted successfully");
        } catch (error) {
          toast.error("Failed to delete ${modelName.toLowerCase()}", {
            description: error instanceof Error ? error.message : "An error occurred",
          });
        }
      },
    });
  };

  const handleBulkDelete = async (ids: number[]) => {
    confirmDialog.openDialog({
      title: "Delete ${modelName}s",
      description: \`Are you sure you want to delete \${ids.length} ${modelName.toLowerCase()}(s)? This action cannot be undone.\`,
      variant: "destructive",
      okLabel: "Delete",
      onConfirm: async () => {
        try {
          await Promise.all(ids.map((id) => delete${modelName}.mutateAsync(id)));
          toast.success(\`\${ids.length} ${modelName.toLowerCase()}(s) deleted successfully\`);
        } catch (error) {
          toast.error("Failed to delete ${plural}", {
            description: error instanceof Error ? error.message : "An error occurred",
          });
        }
      },
    });
  };

  const handleEdit = (${modelCamel}: ${modelName}) => {
    setSelected${modelName}(${modelCamel});
    setIsEditMode(true);
    setFormOpen(true);
  };

  const handleView = (${modelCamel}: ${modelName}) => {
    setSelected${modelName}(${modelCamel});
    setViewDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setSelected${modelName}(null);
    setIsEditMode(false);
  };

  const handleNew${modelName} = () => {
    setSelected${modelName}(null);
    setIsEditMode(false);
    setFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">${capitalized}s</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage your ${plural} and their information
            </p>
          </div>
          {canCreate && (
            <Button 
              onClick={handleNew${modelName}} 
              variant="default"
              style={{ 
                backgroundColor: 'hsl(var(--primary))', 
                color: 'hsl(var(--primary-foreground))' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary) / 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--primary))';
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New ${modelName}
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <${modelName}sTable 
                data={data} 
                onDelete={canDelete ? handleDelete : undefined}
                onEdit={canUpdate ? handleEdit : undefined}
                onView={handleView}
                onBulkDelete={canDelete ? handleBulkDelete : undefined}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) {
          setSelected${modelName}(null);
          setIsEditMode(false);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Edit ${modelName}" : "Create New ${modelName}"}</SheetTitle>
            <SheetDescription>
              {isEditMode 
                ? "Update ${modelName.toLowerCase()} information. Modify the fields as needed."
                : "Add a new ${modelName.toLowerCase()} to the system. Fill in all required fields."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <${modelName}Form 
              key={selected${modelName}?.id || "new"} 
              ${modelCamel}={selected${modelName}} 
              onSuccess={handleFormSuccess} 
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>${modelName} Details</DialogTitle>
            <DialogDescription>
              View detailed information about this ${modelName.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          {selected${modelName} && (
            <div className="space-y-4 py-4">
${viewFields}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
`;
}

// Generate backend API route
function generateBackendAPI(model: ReturnType<typeof parsePrismaModel>) {
  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const plural = modelCamel + 's';
  const dbModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  
  // Get optional string fields for transformation
  const optionalStringFields = model.fields
    .filter(f => f.type === 'String' && f.optional && !['id', 'createdAt', 'updatedAt'].includes(f.name))
    .map(f => f.name);
  
  // Build transformation code for empty strings to null
  const transformFields = optionalStringFields.map(field => 
    `        ${field}: body.${field} === "" ? null : body.${field},`
  ).join('\n');
  
  const transformCode = optionalStringFields.length > 0 
    ? `      // Transform empty strings to null for Prisma
      const ${modelCamel}Data = {
        ...body,${transformFields ? '\n' + transformFields : ''}
      };`
    : `      const ${modelCamel}Data = body;`;

  return `import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db/client";
import { authorize } from "./middlewares";
import type { Variables } from "./types";
import { ${modelCamel}Schema } from "@/features/${plural}/schema";

export const ${plural}Api = new Hono<{ Variables: Variables }>();

${plural}Api.get("/", authorize("read", "${modelName}"), async (c) => {
  try {
    const data = await db.${dbModelName}.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(data);
  } catch (error) {
    console.error("Error fetching ${plural}:", error);
    return c.json({ error: "Failed to fetch ${plural}. Please check your database connection." }, 500);
  }
});

${plural}Api.post(
  "/",
  authorize("create", "${modelName}"),
  zValidator("json", ${modelCamel}Schema),
  async (c) => {
    try {
      const body = c.req.valid("json");
      console.log("Creating ${modelCamel} with data:", body);
      
${transformCode}
      
      const new${modelName} = await db.${dbModelName}.create({
        data: ${modelCamel}Data,
      });
      
      console.log("${modelName} created successfully:", new${modelName});
      return c.json(new${modelName}, 201);
    } catch (error) {
      console.error("Error creating ${modelCamel}:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return c.json({ 
        error: "Failed to create ${modelCamel}", 
        message: error instanceof Error ? error.message : "Unknown error",
        details: error 
      }, 500);
    }
  }
);

${plural}Api.put(
  "/:id",
  authorize("update", "${modelName}"),
  zValidator("json", ${modelCamel}Schema),
  async (c) => {
    try {
      const id = Number(c.req.param("id"));
      const body = c.req.valid("json");
      
${transformCode.replace('body', 'body')}
      
      const updated${modelName} = await db.${dbModelName}.update({
        where: { id },
        data: ${modelCamel}Data,
      });
      
      return c.json(updated${modelName});
    } catch (error) {
      console.error("Error updating ${modelCamel}:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      return c.json({ 
        error: "Failed to update ${modelCamel}",
        message: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }
  }
);

${plural}Api.delete("/:id", authorize("delete", "${modelName}"), async (c) => {
  try {
    const id = Number(c.req.param("id"));
    await db.${dbModelName}.delete({
      where: { id },
    });
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting ${modelCamel}:", error);
    return c.json({ error: "Failed to delete ${modelCamel}. Please check your database connection." }, 500);
  }
});
`;
}

// Main execution
const modelName = process.argv[2];
if (!modelName) {
  console.error('❌ Error: Model name is required');
  console.log('Usage: npm run generate:crud <ModelName>');
  console.log('Example: npm run generate:crud Inventory');
  process.exit(1);
}

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

try {
  console.log(`🔍 Reading Prisma model: ${modelName}...`);
  const model = parsePrismaModel(schemaPath, modelName);

  console.log(`📝 Found ${model.fields.length} fields`);

  // Generate files
  const featureDir = path.join(process.cwd(), 'src', 'features', model.name.toLowerCase() + 's');
  fs.mkdirSync(featureDir, { recursive: true });

  // Generate schema
  fs.writeFileSync(
    path.join(featureDir, 'schema.ts'),
    generateSchema(model)
  );
  console.log(`✅ Generated schema.ts`);

  // Generate API
  fs.writeFileSync(
    path.join(featureDir, 'api.ts'),
    generateAPI(model)
  );
  console.log(`✅ Generated api.ts`);

  // Generate hooks
  fs.writeFileSync(
    path.join(featureDir, 'hooks.ts'),
    generateHooks(model)
  );
  console.log(`✅ Generated hooks.ts`);

  // Generate backend API
  const backendApiPath = path.join(process.cwd(), 'src', 'server', 'api', `${model.name.toLowerCase()}s.ts`);
  fs.writeFileSync(backendApiPath, generateBackendAPI(model));
  console.log(`✅ Generated backend API: ${backendApiPath}`);

  // Update main API route
  const mainApiRoute = path.join(process.cwd(), 'src', 'app', 'api', '[[...route]]', 'route.ts');
  let mainApiContent = fs.readFileSync(mainApiRoute, 'utf-8');
  
  // Add import
  const importLine = `import { ${model.name.toLowerCase()}sApi } from "@/server/api/${model.name.toLowerCase()}s";`;
  if (!mainApiContent.includes(importLine)) {
    // Find the last import before the middlewares import
    const middlewaresImportIndex = mainApiContent.indexOf('import {');
    const healthApiImportIndex = mainApiContent.indexOf('import { healthApi }');
    let insertAfter = healthApiImportIndex;
    if (insertAfter === -1) {
      // Fallback: find any import line
      const lastImportMatch = mainApiContent.match(/import.*from.*;\n/g);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        insertAfter = mainApiContent.lastIndexOf(lastImport) + lastImport.length;
      } else {
        insertAfter = middlewaresImportIndex;
      }
    } else {
      // Find the end of the healthApi import line
      const endOfLine = mainApiContent.indexOf('\n', healthApiImportIndex);
      insertAfter = endOfLine + 1;
    }
    mainApiContent = mainApiContent.slice(0, insertAfter) + 
      importLine + '\n' + 
      mainApiContent.slice(insertAfter);
    fs.writeFileSync(mainApiRoute, mainApiContent);
  }
  
  // Add route
  const routeLine = `app.route("/${model.name.toLowerCase()}s", ${model.name.toLowerCase()}sApi);`;
  if (!mainApiContent.includes(routeLine)) {
    // Find the last app.route line
    const routeMatches = mainApiContent.match(/app\.route\([^)]+\);/g);
    if (routeMatches && routeMatches.length > 0) {
      const lastRoute = routeMatches[routeMatches.length - 1];
      const lastRouteIndex = mainApiContent.lastIndexOf(lastRoute);
      const endOfRoute = lastRouteIndex + lastRoute.length;
      mainApiContent = mainApiContent.slice(0, endOfRoute) + 
        '\n' + routeLine + 
        mainApiContent.slice(endOfRoute);
      fs.writeFileSync(mainApiRoute, mainApiContent);
    }
  }

  console.log(`✅ Updated main API route`);

  // Update Subject enum in src/types/index.ts
  const typesPath = path.join(process.cwd(), 'src', 'types', 'index.ts');
  let typesContent = fs.readFileSync(typesPath, 'utf-8');
  
  // Check if Subject enum already contains the model
  const subjectEnumRegex = /export enum Subject \{([\s\S]+?)\}/;
  const subjectMatch = typesContent.match(subjectEnumRegex);
  
  if (subjectMatch) {
    const enumBody = subjectMatch[1];
    // Check if model is already in enum
    if (!enumBody.includes(`${modelName} = '${modelName}'`)) {
      // Find the last entry before "All = 'all'"
      const allIndex = enumBody.indexOf("All = 'all'");
      if (allIndex !== -1) {
        const beforeAll = enumBody.slice(0, allIndex).trim();
        const afterAll = enumBody.slice(allIndex);
        const newEnumBody = beforeAll + 
          (beforeAll.endsWith(',') ? '' : ',') + 
          `\n  ${modelName} = '${modelName}',` + 
          '\n  ' + afterAll;
        typesContent = typesContent.replace(subjectEnumRegex, `export enum Subject {${newEnumBody}}`);
        fs.writeFileSync(typesPath, typesContent);
        console.log(`✅ Added "${modelName}" to Subject enum`);
      }
    } else {
      console.log(`ℹ️  "${modelName}" already exists in Subject enum`);
    }
  }

  // Update authorize function in authorization-middleware.ts
  const authMiddlewarePath = path.join(process.cwd(), 'src', 'server', 'api', 'middlewares', 'authorization-middleware.ts');
  let authMiddlewareContent = fs.readFileSync(authMiddlewarePath, 'utf-8');
  
  // Find the authorize function signature - match the subject parameter type
  // Match: subject: "User" | "Settings" | "Customer" | "all" | string
  const authorizeRegex = /subject:\s*"([^"]+)"(?:\s*\|\s*"([^"]+)")*(?:\s*\|\s*"all")?(?:\s*\|\s*string)?/;
  const authorizeMatch = authMiddlewareContent.match(authorizeRegex);
  
  if (authorizeMatch) {
    const fullMatch = authorizeMatch[0];
    // Check if model is already in the type union
    if (!fullMatch.includes(`"${modelName}"`)) {
      // Find the position before "all" or "string"
      const allIndex = fullMatch.indexOf('"all"');
      const stringIndex = fullMatch.indexOf('| string');
      
      if (allIndex !== -1) {
        // Insert the new subject before "all"
        const beforeAll = fullMatch.slice(0, allIndex).trim();
        const afterAll = fullMatch.slice(allIndex);
        const newSubjects = beforeAll + 
          (beforeAll.endsWith('"') ? ' | ' : '') + 
          `"${modelName}" | ` + 
          afterAll;
        authMiddlewareContent = authMiddlewareContent.replace(fullMatch, newSubjects);
        fs.writeFileSync(authMiddlewarePath, authMiddlewareContent);
        console.log(`✅ Updated authorize function to accept "${modelName}"`);
      } else if (stringIndex !== -1) {
        // Insert before "string"
        const beforeString = fullMatch.slice(0, stringIndex).trim();
        const afterString = fullMatch.slice(stringIndex);
        const newSubjects = beforeString + 
          (beforeString.endsWith('"') ? ' | ' : '') + 
          `"${modelName}" | ` + 
          afterString;
        authMiddlewareContent = authMiddlewareContent.replace(fullMatch, newSubjects);
        fs.writeFileSync(authMiddlewarePath, authMiddlewareContent);
        console.log(`✅ Updated authorize function to accept "${modelName}"`);
      } else {
        // If no "all" or "string", just append
        const newSubjects = fullMatch + ` | "${modelName}"`;
        authMiddlewareContent = authMiddlewareContent.replace(fullMatch, newSubjects);
        fs.writeFileSync(authMiddlewarePath, authMiddlewareContent);
        console.log(`✅ Updated authorize function to accept "${modelName}"`);
      }
    } else {
      console.log(`ℹ️  "${modelName}" already exists in authorize function`);
    }
  }

  // Run Prisma commands
  console.log(`\n🔄 Running Prisma commands...`);
  try {
    console.log(`   → Running prisma db push...`);
    execSync('npx prisma db push', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
    console.log(`   ✅ Database schema updated`);
    
    console.log(`   → Running prisma generate...`);
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd() 
    });
    console.log(`   ✅ Prisma client generated`);
  } catch (error) {
    console.error(`   ⚠️  Prisma commands failed. Please run manually:`);
    console.error(`      npx prisma db push`);
    console.error(`      npx prisma generate`);
  }

  console.log('\n✨ CRUD files generated successfully!');
  console.log(`📁 Location: ${featureDir}`);
  // Generate UI components
  const dashboardDir = path.join(process.cwd(), 'src', 'app', '(main)', 'dashboard', model.name.toLowerCase() + 's');
  fs.mkdirSync(dashboardDir, { recursive: true });

  // Generate form component
  const formPath = path.join(dashboardDir, `${model.name.toLowerCase()}-form.tsx`);
  fs.writeFileSync(formPath, generateFormComponent(model));
  console.log(`✅ Generated form component: ${formPath}`);

  // Generate table component
  const tablePath = path.join(dashboardDir, `${model.name.toLowerCase()}-table.tsx`);
  fs.writeFileSync(tablePath, generateTableComponent(model));
  console.log(`✅ Generated table component: ${tablePath}`);

  // Generate page component
  const pagePath = path.join(dashboardDir, 'page.tsx');
  fs.writeFileSync(pagePath, generatePageComponent(model));
  console.log(`✅ Generated page component: ${pagePath}`);

  // Update sidebar navigation
  const sidebarPath = path.join(process.cwd(), 'src', 'components', 'app-sidebar.tsx');
  let sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
  
  // Check if navigation item already exists
  const navItemRegex = new RegExp(`href: "/dashboard/${model.name.toLowerCase()}s"`, 'i');
  if (!navItemRegex.test(sidebarContent)) {
    // Find a suitable icon - use Package as default, or ShoppingCart for Customer, etc.
    let iconName = 'Package';
    const modelLower = model.name.toLowerCase();
    if (modelLower.includes('customer') || modelLower.includes('client')) {
      iconName = 'Users';
    } else if (modelLower.includes('product') || modelLower.includes('item')) {
      iconName = 'Package';
    } else if (modelLower.includes('order') || modelLower.includes('transaction')) {
      iconName = 'ShoppingCart';
    } else if (modelLower.includes('invoice') || modelLower.includes('bill')) {
      iconName = 'FileText';
    } else if (modelLower.includes('category')) {
      iconName = 'Folder';
    } else if (modelLower.includes('tag') || modelLower.includes('label')) {
      iconName = 'Tag';
    }
    
    // Add icon import if not already present
    const iconImportRegex = new RegExp(`import.*\\{[^}]*${iconName}[^}]*\\}.*from.*lucide-react`, 'i');
    if (!iconImportRegex.test(sidebarContent)) {
      // Find the lucide-react import line
      const lucideImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/;
      const lucideMatch = sidebarContent.match(lucideImportRegex);
      if (lucideMatch) {
        const existingImports = lucideMatch[1].trim();
        const newImports = existingImports + `,\n  ${iconName}`;
        sidebarContent = sidebarContent.replace(lucideImportRegex, `import {\n  ${newImports}\n} from "lucide-react"`);
      }
    }
    
    // Update NavigationItem type to include the new model
    const navItemTypeRegex = /subject:\s*"([^"]+)"(?:\s*\|\s*"([^"]+)")*(?:\s*\|\s*"all")?/;
    const navItemTypeMatch = sidebarContent.match(navItemTypeRegex);
    if (navItemTypeMatch) {
      const fullMatch = navItemTypeMatch[0];
      if (!fullMatch.includes(`"${modelName}"`)) {
        const allIndex = fullMatch.indexOf('"all"');
        if (allIndex !== -1) {
          const beforeAll = fullMatch.slice(0, allIndex).trim();
          const afterAll = fullMatch.slice(allIndex);
          const newType = beforeAll + 
            (beforeAll.endsWith('"') ? ' | ' : '') + 
            `"${modelName}" | ` + 
            afterAll;
          sidebarContent = sidebarContent.replace(fullMatch, newType);
        } else {
          const newType = fullMatch + ` | "${modelName}"`;
          sidebarContent = sidebarContent.replace(fullMatch, newType);
        }
      }
    }
    
    // Add navigation item before Settings (or at the end if Settings not found)
    // Find the Settings navigation item more precisely
    const settingsNavRegex = /(\s+)(\{\s*title:\s*"Settings"[\s\S]*?\},)/;
    const settingsMatch = sidebarContent.match(settingsNavRegex);
    
    const navItem = `  {
    title: "${modelName}s",
    href: "/dashboard/${model.name.toLowerCase()}s",
    icon: ${iconName},
    permission: { action: "read", subject: "${modelName}" },
  },`;
    
    if (settingsMatch) {
      // Insert before Settings - use the same indentation
      const indent = settingsMatch[1];
      sidebarContent = sidebarContent.replace(settingsNavRegex, `${indent}${navItem}\n${indent}$2`);
    } else {
      // Add at the end of navigation array (before closing bracket)
      // Find the last item in the array
      const lastItemRegex = /(\s+\{[\s\S]*?\},)\s*(\];)/;
      const lastItemMatch = sidebarContent.match(lastItemRegex);
      if (lastItemMatch) {
        const indent = lastItemMatch[1].match(/^(\s+)/)?.[1] || '  ';
        sidebarContent = sidebarContent.replace(lastItemRegex, `$1\n${indent}${navItem}\n$2`);
      } else {
        // Fallback: just before closing bracket
        sidebarContent = sidebarContent.replace(/(\],)/, `  ${navItem}\n$1`);
      }
    }
    
    fs.writeFileSync(sidebarPath, sidebarContent);
    console.log(`✅ Added "${modelName}s" to sidebar navigation`);
  } else {
    console.log(`ℹ️  "${modelName}s" already exists in sidebar navigation`);
  }

  console.log(`\n📋 Optional next step:`);
  console.log(`   Seed abilities for ${modelName} in prisma/seed-abilities.ts`);

} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

