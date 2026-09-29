import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { BillingType, PriceType } from "@prisma/client";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class ServiceSectionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;
}
export class ServiceDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug: string;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  summary: string;
  @Transform(trim)
  @IsString()
  @MaxLength(250)
  heroTitle: string;
  @Transform(trim)
  @IsString()
  @MaxLength(3000)
  description: string;
  @Transform(trim)
  @IsString()
  @MaxLength(250)
  bodyHeading: string;
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  bodyText: string;
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ServiceSectionDto)
  sections: ServiceSectionDto[];
  @IsIn([
    "code",
    "monitor",
    "search",
    "bot",
    "paintbrush",
    "compass",
    "shield",
    "scale",
  ])
  iconKey: string;
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  seoTitle: string;
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  seoDescription: string;
  @IsBoolean()
  showOnHomepage: boolean;
  @IsBoolean()
  showInFooter: boolean;
  @IsBoolean()
  isPublished: boolean;
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder: number;
}
export class PackageDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug: string;
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  serviceId: string;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;
  @IsIn(["Starter", "Growth", "Pro"])
  tier: string;
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  shortDescription: string;
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(500, { each: true })
  features: string[];
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  bestFor: string;
  @IsEnum(PriceType)
  priceType: PriceType;
  @IsEnum(BillingType)
  billingType: BillingType;
  @ValidateIf((_object, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(99999999)
  amount: number | null;
  @IsIn(["gbp"])
  currency: string;
  @IsBoolean()
  purchasable: boolean;
  @IsBoolean()
  isPublished: boolean;
  @IsBoolean()
  isActive: boolean;
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder: number;
}
export class BundleDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug: string;
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  shortDescription: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  packageIds: string[];
  @IsBoolean()
  isSignature: boolean;
  @IsBoolean()
  isPublished: boolean;
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder: number;
}
