import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  DeleteFileDto,
  DeleteMultipleFilesDto,
  FileUploadResponseDto,
} from './dto/vps-file-upload.dto';
import { VpsFileUploadService } from './vps-fileupload.service';

@ApiTags('Upload File -------------------- File Upload into VPS')
@Controller('upload')
export class VpsFileUploadController {
  constructor(private readonly uploadService: VpsFileUploadService) {}

  @Post('single')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingle(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType:
              /(jpg|jpeg|png|gif|pdf|doc|docx|mp3|wav|ogg|aac|mp4|webm|mpeg|mov|mkv)$/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<FileUploadResponseDto> {
    return this.uploadService.uploadFile(file);
  }

  // ------------------------ Upload Multiple Files ----------------------- //
  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files (max 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({
            fileType:
              /(jpg|jpeg|png|gif|pdf|doc|docx|mp3|wav|ogg|aac|mp4|webm|mpeg|mov|mkv)$/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('No files provided');
    }

    return this.uploadService.uploadMultiple(files);
  }

  @Delete('single')
  @ApiOperation({ summary: 'Delete a single file' })
  async deleteSingle(@Body() dto: DeleteFileDto) {
    await this.uploadService.deleteFile(dto.filename);
    return {
      message: 'File deleted successfully',
      filename: dto.filename,
    };
  }

  @Delete('multiple')
  @ApiOperation({ summary: 'Delete multiple files' })
  async deleteMultiple(@Body() dto: DeleteMultipleFilesDto) {
    const result = await this.uploadService.deleteMultiple(dto.filenames);
    return {
      message: 'Deletion completed',
      ...result,
    };
  }
}
