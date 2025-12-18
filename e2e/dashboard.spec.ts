import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    // You may need to adjust this based on your auth setup
    await page.goto("/login");
    // Add login steps here
  });

  test("should display dashboard page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("should navigate to users page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: /users/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/users/);
  });

  test("should display sidebar navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("navigation")).toBeVisible();
  });
});

