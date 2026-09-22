import { BadRequestException } from "@nestjs/common";
import { Package } from "@prisma/client";

export function assertPurchasable(
  pkg: Package,
): asserts pkg is Package & { amount: number } {
  if (
    !pkg.isActive ||
    !pkg.isPublished ||
    !pkg.purchasable ||
    pkg.priceType !== "FIXED" ||
    pkg.billingType !== "ONE_TIME" ||
    pkg.currency !== "gbp" ||
    pkg.amount === null ||
    !Number.isInteger(pkg.amount) ||
    pkg.amount < 30 ||
    pkg.amount > 99999999
  ) {
    throw new BadRequestException(
      "This offer is available by enquiry only or is no longer available for checkout.",
    );
  }
}
