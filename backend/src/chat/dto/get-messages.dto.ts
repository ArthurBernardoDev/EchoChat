import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator'
import { Transform } from 'class-transformer'

export class GetMessagesDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50

  @IsOptional()
  @IsString()
  before?: string // ISO date string

  @IsOptional()
  @IsString()
  after?: string // ISO date string
}
