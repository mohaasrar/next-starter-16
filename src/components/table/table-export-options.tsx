"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DownloadIcon, FileIcon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

const exportOptions = [
  {
    label: "Export as CSV",
    icon: FileIcon,
    action: "csv",
  },
  {
    label: "Export as Excel",
    icon: FileIcon,
    action: "excel",
  },
];

interface DataTableExportOptionsProps<TData> {
  table: Table<TData>;
  onExport?: (format: "csv" | "excel") => void;
}

export function DataTableExportOptions<TData>({
  table,
  onExport,
}: DataTableExportOptionsProps<TData>) {
  const handleExport = (format: "csv" | "excel") => {
    if (onExport) {
      onExport(format);
      return;
    }

    // Default CSV export implementation
    const rows = table.getFilteredRowModel().rows;
    const headers = table
      .getAllColumns()
      .filter((column) => column.getIsVisible())
      .map((column) => column.id);

    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const value = row.getValue(header);
              // Escape commas and quotes in CSV
              if (value === null || value === undefined) return "";
              const stringValue = String(value);
              if (stringValue.includes(",") || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `export-${new Date().toISOString()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <DownloadIcon className="mr-2 h-3.5 w-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuLabel>Export options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {exportOptions.map((option) => {
          return (
            <DropdownMenuCheckboxItem
              key={option.label}
              className="capitalize"
              onSelect={() => handleExport(option.action as "csv" | "excel")}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

