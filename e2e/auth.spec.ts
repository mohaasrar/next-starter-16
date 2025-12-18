import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/login/i);
    await expect(page.getByRole("heading", { name: /login/i })).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    
    // Wait for validation errors
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test("should redirect to dashboard after successful login", async ({ page }) => {
    // This test assumes you have a test user
    // You may need to seed test data first
    await page.goto("/login");
    
    // Fill in login form (adjust selectors based on your form)
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/password/i).fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should redirect to login when accessing protected route", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

