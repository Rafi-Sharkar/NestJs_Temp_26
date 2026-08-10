import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class DeleteFileDto {
  @ApiProperty({
    description: 'Filename to delete',
    example: '1234567890_image.jpg',
  })
  @IsNotEmpty()
  @IsString()
  filename: string;
}

export class DeleteMultipleFilesDto {
  @ApiProperty({
    description: 'Array of filenames to delete',
    type: [String],
    example: ['1234567890_file1.jpg', '1234567891_file2.png'],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  filenames: string[];
}

export class FileUploadResponseDto {
  @ApiProperty({ example: '1234567890_image.jpg' })
  filename: string;

  @ApiProperty({
    example: 'http://localhost:3000/uploads/1234567890_image.jpg',
  })
  url: string;

  @ApiProperty({ example: 102400 })
  size: number;
}

export class MultipleFileUploadResponseDto {
  @ApiProperty({
    example: ['https://api.naqel.app/uploads/a.jpg'],
    type: [String],
  })
  files: string[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  success: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ required: false })
  errors?: Array<{ filename: string; error: string }>;
}
