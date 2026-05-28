import { Controller, Post, Get, Del, Inject, Body, UseGuard, Param } from '@midwayjs/decorator';
import { Validate } from '@midwayjs/validate';
import { ApiTags } from '@midwayjs/swagger';
import { AuthGuard } from '../../../common/guard/auth.guard';
import { Role } from '../../../common/decorator/role.decorator';
import { RoleType } from '../../../common/types/interface';
import {
  buildPaginationQuery,
  buildPaginatedResult,
  buildMongoFilter,
} from '../../../common/util/pagination.helper';
import { PaginationReqDto } from '../../../common/dto/pagination.dto';
import { DevTypeService } from '../../../module/protocol/service/device-type.service';
import { Protocols } from '../../../mongo_entity';

@ApiTags('v2/admin/device-types')
@Controller('/api/v2/admin/device-types')
@UseGuard(AuthGuard)
export class AdminDeviceTypeController {
  @Inject()
  devTypeService: DevTypeService;

  /**
   * 获取所有设备类型（分页 + 搜索 + 过滤）
   * v1: POST /api/root/DevTypes
   */
  @Post('/list')
  @Validate()
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async listDeviceTypes(@Body() dto: PaginationReqDto) {
    const query = buildPaginationQuery({
      ...dto,
      allowedSortFields: ['DevModel', 'Type', 'createdAt'],
    });

    const allowedFilterFields = ['DevModel', 'Type'];
    const mongoFilter = buildMongoFilter(dto.search, dto.filters, allowedFilterFields);

    const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;

    const [items, total] = await Promise.all([
      this.devTypeService.devTypeModel
        .find(mongoFilter)
        .sort(sort)
        .skip(query.skip)
        .limit(query.pageSize)
        .lean(),
      query.needTotal
        ? this.devTypeService.devTypeModel.countDocuments(mongoFilter)
        : Promise.resolve(undefined),
    ]);

    return buildPaginatedResult(items, query, total);
  }

  /**
   * 获取指定设备类型
   * v1: POST /api/root/DevType
   */
  @Get('/:model')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async getDeviceType(@Param('model') DevModel: string) {
    return await this.devTypeService.devTypeModel.find({ DevModel }).lean();
  }

  /**
   * 添加设备类型
   * v1: POST /api/root/addDevType
   */
  @Post('/')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async addDeviceType(
    @Body('Type') Type: string,
    @Body('DevModel') DevModel: string,
    @Body('Protocols') Protocols: Pick<Protocols, 'Type' | 'Protocol'>[]
  ) {
    return await this.devTypeService.addDevType(Type, DevModel, Protocols);
  }

  /**
   * 删除设备类型
   * v1: POST /api/root/deleteDevModel
   */
  @Del('/:model')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async deleteDeviceType(@Param('model') DevModel: string) {
    return await this.devTypeService.deleteDevModel(DevModel);
  }
}
