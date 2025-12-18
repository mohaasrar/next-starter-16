#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

// Parse Prisma schema to extract model
function parsePrismaModel(schemaPath: string, modelName: string) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  // Find the model block
  const modelRegex = new RegExp(
    `model\\s+${modelName}\\s*\\{([^}]+)\\}`,
    's'
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

  // Parse fields
  const fieldRegex = /(\w+)\s+(\w+(?:\[\])?)\s*(\?)?\s*([^@\n]*)/g;
  let fieldMatch;

  while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
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

  if (optional && !defaultValue) {
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
  create: (data: ${modelName}Input) =>
    fetch("${apiPath}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
  update: (id: number, data: ${modelName}Input) =>
    fetch(\`${apiPath}/\${id}\`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),
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
      queryClient.setQueryData<any[]>(["${plural}"], (old) => {
        if (!old) return [new${modelName}];
        return [new${modelName}, ...old];
      });
      await queryClient.invalidateQueries({ queryKey: ["${plural}"], refetchType: "active" });
    },
  });
};

export const useUpdate${modelName} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ${modelName}Input }) =>
      ${plural}Api.update(id, data),
    onSuccess: async (updated${modelName}) => {
      queryClient.setQueryData<any[]>(["${plural}"], (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === updated${modelName}.id ? updated${modelName} : item));
      });
      await queryClient.invalidateQueries({ queryKey: ["${plural}"], refetchType: "active" });
    },
  });
};

export const useDelete${modelName} = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ${plural}Api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["${plural}"] });
    },
  });
};
`;
}

// Generate backend API route
function generateBackendAPI(model: ReturnType<typeof parsePrismaModel>) {
  const modelName = model.name;
  const modelCamel = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const plural = modelCamel + 's';
  const dbModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

  return `import { Hono } from "hono";
import { db } from "../db/client";
import { authorize } from "./middlewares";
import type { Variables } from "./types";

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

${plural}Api.post("/", authorize("create", "${modelName}"), async (c) => {
  try {
    const body = await c.req.json();
    const new${modelName} = await db.${dbModelName}.create({
      data: body,
    });
    return c.json(new${modelName}, 201);
  } catch (error) {
    console.error("Error creating ${modelCamel}:", error);
    return c.json({ error: "Failed to create ${modelCamel}. Please check your database connection." }, 500);
  }
});

${plural}Api.put("/:id", authorize("update", "${modelName}"), async (c) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    
    const updated${modelName} = await db.${dbModelName}.update({
      where: { id },
      data: body,
    });
    
    return c.json(updated${modelName});
  } catch (error) {
    console.error("Error updating ${modelCamel}:", error);
    return c.json({ error: "Failed to update ${modelCamel}. Please check your database connection." }, 500);
  }
});

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
  const mainApiContent = fs.readFileSync(mainApiRoute, 'utf-8');
  
  // Add import
  const importLine = `import { ${model.name.toLowerCase()}sApi } from "@/server/api/${model.name.toLowerCase()}s";`;
  if (!mainApiContent.includes(importLine)) {
    const importInsertionPoint = mainApiContent.indexOf('import { abilitiesApi }');
    if (importInsertionPoint !== -1) {
      const newContent = mainApiContent.slice(0, importInsertionPoint) + 
        importLine + '\n' + 
        mainApiContent.slice(importInsertionPoint);
      fs.writeFileSync(mainApiRoute, newContent);
    }
  }
  
  // Add route
  const routeLine = `app.route("/${model.name.toLowerCase()}s", ${model.name.toLowerCase()}sApi);`;
  if (!mainApiContent.includes(routeLine)) {
    const routeInsertionPoint = mainApiContent.indexOf('app.route("/abilities"');
    if (routeInsertionPoint !== -1) {
      const afterAbilities = mainApiContent.indexOf('\n', routeInsertionPoint);
      const newContent = mainApiContent.slice(0, afterAbilities + 1) + 
        routeLine + '\n' + 
        mainApiContent.slice(afterAbilities + 1);
      fs.writeFileSync(mainApiRoute, newContent);
    }
  }

  console.log(`✅ Updated main API route`);

  console.log('\n✨ CRUD files generated successfully!');
  console.log(`📁 Location: ${featureDir}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Create form component: src/app/(main)/dashboard/${model.name.toLowerCase()}s/${model.name.toLowerCase()}-form.tsx`);
  console.log(`   2. Create table component: src/app/(main)/dashboard/${model.name.toLowerCase()}s/${model.name.toLowerCase()}-table.tsx`);
  console.log(`   3. Create page: src/app/(main)/dashboard/${model.name.toLowerCase()}s/page.tsx`);
  console.log(`   4. Add "${modelName}" to CASL Subject enum in src/types/index.ts`);
  console.log(`   5. Seed abilities for ${modelName} in prisma/seed-abilities.ts`);

} catch (error) {
  console.error('❌ Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

