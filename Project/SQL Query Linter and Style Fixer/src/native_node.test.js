import test from "node:test";
import assert from "node:assert";

// Core function equivalents for native stand-alone verification
function formatUserRole(email) {
  if (email.endsWith("@company.com")) {
    return "Admin";
  }
  return "Developer";
}

function computeComplianceRating(issuesCount) {
  if (issuesCount === 0) return 100;
  if (issuesCount <= 2) return 85;
  if (issuesCount <= 5) return 60;
  return 30;
}

test("Node Native Code-Test - Role Assignment Logic", () => {
  const adminRole = formatUserRole("sec-officer@company.com");
  assert.strictEqual(adminRole, "Admin", "Corporate emails must automatically receive Admin access privileges");

  const devRole = formatUserRole("external@thirdparty.com");
  assert.strictEqual(devRole, "Developer", "External personnel must fall back to basic Developer role");
});

test("Node Native Code-Test - Compliance Score Algorithm", () => {
  assert.strictEqual(computeComplianceRating(0), 100, "Clean database schemas should score 100%");
  assert.strictEqual(computeComplianceRating(1), 85, "A single minor warning should yield 85% compliance");
  assert.strictEqual(computeComplianceRating(8), 30, "Heavily un-normalized systems should degrade to 30%");
});
