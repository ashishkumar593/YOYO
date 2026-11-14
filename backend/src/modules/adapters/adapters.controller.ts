import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdaptersService } from './adapters.service';
import { CreateAdapterDto } from './dto/create-adapter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/adapters')
@UseGuards(JwtAuthGuard)
export class AdaptersController {
  constructor(private adaptersService: AdaptersService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateAdapterDto) {
    return this.adaptersService.create(user.id, dto);
  }

  @Get()
  async findAll() {
    return this.adaptersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adaptersService.findById(id);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adaptersService.delete(user.id, id, user.role);
  }
}
