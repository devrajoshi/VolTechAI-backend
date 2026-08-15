import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for POST /api/payments/checkout
 *
 * Only the packageId is accepted from the client.
 * The orderId is generated server-side to prevent client manipulation.
 * The amount and currency are fetched from the database — never trusted from the client.
 */
export class CreateCheckoutDto {
    @IsString()
    @IsNotEmpty({ message: 'packageId is required.' })
    packageId!: string;
}
