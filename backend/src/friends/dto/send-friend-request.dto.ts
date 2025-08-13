import { IsString, MinLength, MaxLength } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;
}
