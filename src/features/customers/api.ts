import { fetcher } from "@/lib/fetcher";
import { CustomerInput } from "./schema";

export const customersApi = {
  getAll: () => fetcher("/api/customers"),
  create: async (data: CustomerInput) => {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to create customer";
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
  update: async (id: number, data: CustomerInput) => {
    const response = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      let errorMessage = "Failed to update customer";
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
    fetch(`/api/customers/${id}`, {
      method: "DELETE",
    }).then((r) => r.json()),
};
