import { Controller, Post, Get, Del, Inject, Body, UseGuard, Param } from '@midwayjs/decorator';
import { ApiTags, ApiBearerAuth } from '@midwayjs/swagger';
import { AuthGuard } from '../../../common/guard/auth.guard';
import { Role } from '../../../common/decorator/role.decorator';
import { RoleType } from '../../../common/types/interface';
import { NodeClientService } from '../../../module/realtime/service/node-client.service';

@ApiTags('v2/admin/nodes')
@ApiBearerAuth()
@Controller('/api/v2/admin/nodes')
@UseGuard(AuthGuard)
export class AdminNodeController {
  @Inject()
  nodeClientService: NodeClientService;

  /**
   * 获取指定节点
   * v1: POST /api/root/Node
   */
  @Get('/:name')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async getNode(@Param('name') name: string) {
    return await this.nodeClientService.getNode(name);
  }

  /**
   * 添加/更新节点
   * v1: POST /api/root/setNode
   */
  @Post('/')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async setNode(
    @Body('Name') Name: string,
    @Body('IP') IP: string,
    @Body('Port') Port: number,
    @Body('MaxConnections') MaxConnections: number
  ) {
    return await this.nodeClientService.setNode(Name, IP, Port, MaxConnections);
  }

  /**
   * 删除节点
   * v1: POST /api/root/deleteNode
   */
  @Del('/:name')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async deleteNode(@Param('name') Name: string) {
    return await this.nodeClientService.deleteNode(Name);
  }
}
