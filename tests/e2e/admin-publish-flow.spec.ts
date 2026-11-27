import { expect, test } from "@playwright/test";

test.describe("Invite-Only Admin Login & Pre-Configuration Guards", () => {
  test("renders invite-only /admin/login page without public sign-up and protects /admin/mfa", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await expect(page.locator("body")).toContainText(/invite-only/i);
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();

    // Ensure there is zero public sign-up or registration link on the admin login screen
    await expect(page.getByRole("link", { name: /sign up|register/i })).toHaveCount(
      0
    );

    // /admin/mfa without an active session redirects back cleanly to /admin/login
    await page.goto("/admin/mfa");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
