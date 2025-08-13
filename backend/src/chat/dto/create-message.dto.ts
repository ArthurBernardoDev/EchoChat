import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsString()
  @IsNotEmpty()
  roomId: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000) // Limite de 4000 caracteres por mensagem
  content: string

  @IsOptional()
  @IsString()
  replyToId?: string
}
