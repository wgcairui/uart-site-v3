import { Controller, Post, Get, Inject, Body, UseGuard, Query } from '@midwayjs/decorator';
import { ApiTags, ApiBearerAuth } from '@midwayjs/swagger';
import { AuthGuard } from '../../../common/guard/auth.guard';
import { Role } from '../../../common/decorator/role.decorator';
import { RoleType } from '../../../common/types/interface';
import { parseTime } from '../../../common/util/util';
import { CustomMenu, WxPublicService } from '../../../module/wechat/service/wx-public.service';
import { WxUserService } from '../../../module/user/service/wx-user.service';
import { BullService } from '../../../common/infrastructure/bull.service';
import { LogWxEventService } from '../../../module/wechat/service/log-wx-event.service';
import {
  buildPaginationQuery,
  buildPaginatedResult,
} from '../../../common/util/pagination.helper';
import { PaginationReqDto } from '../../../common/dto/pagination.dto';

@ApiTags('v2/admin/wx')
@ApiBearerAuth()
@Controller('/api/v2/admin/wx')
@UseGuard(AuthGuard)
export class AdminWxController {
  @Inject()
  wxPublicService: WxPublicService;

  @Inject()
  wxUserService: WxUserService;

  @Inject()
  bullService: BullService;

  @Inject()
  logWxEventService: LogWxEventService;

  /**
   * 设置公众号菜单
   * v1: POST /api/root/set-wx-menu
   */
  @Post('/menu')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async setMenu() {
    const menu: CustomMenu = {
      button: [
        { type: 'view', name: '常见问题', url: 'http://www.ladis.com.cn/support/node_25.shtml' },
        {
          name: '联系我们',
          sub_button: [
            { type: 'view', name: '联系方式', url: 'http://www.ladis.com.cn/about/node_33.shtml' },
            { type: 'view', name: '服务网络', url: 'http://www.ladis.com.cn/about/node_37.shtml' },
          ],
        },
        {
          name: '商城',
          sub_button: [
            { type: 'view', name: '官网', url: 'http://www.ladis.com.cn/' },
            { type: 'view', name: '京东自营旗舰店', url: 'https://mall.jd.com/index-1000278768.html' },
            { type: 'view', name: '天猫旗舰店', url: 'https://leidisi.tmall.com/' },
            { type: 'click', name: '关于我们', key: 'ABOUT_US' },
          ],
        },
      ],
    };
    return await this.wxPublicService.createMenu(menu);
  }

  /**
   * 获取公众号图文素材列表
   * v1: POST /api/root/materials_list
   */
  @Get('/materials')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async listMaterials(
    @Query('type') type: 'image' | 'video' | 'voice' | 'news',
    @Query('offset') offset: number,
    @Query('count') count: number
  ) {
    return await this.wxPublicService.get_materials_list_Public({ type, offset, count });
  }

  /**
   * 获取所有公众号用户
   * v1: POST /api/root/wx_users
   */
  @Get('/users')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async listUsers() {
    return await this.wxUserService.model.find().lean();
  }

  /**
   * 同步公众号用户资料
   * v1: POST /api/root/update_wx_users_all
   */
  @Post('/users/sync')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async syncUsers() {
    const users = await this.wxPublicService.saveUserInfo();
    return await Promise.all(users.users.map(el => this.wxUserService.updateWxUser(el)));
  }

  /**
   * 向指定用户推送模板消息
   * v1: POST /api/root/wx_send_info
   */
  @Post('/send')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async sendMessage(
    @Body('openid') openid: string,
    @Body('content') content: string
  ) {
    if (!openid) throw new Error('openId NotFound');

    const postData: Uart.WX.wxsubscribeMessage = {
      touser: openid,
      template_id: 'rIFS7MnXotNoNifuTfFpfh4vFGzCGlhh-DmWZDcXpWg',
      miniprogram: { appid: 'wx38800d0139103920', pagepath: 'pages/index/index' },
      data: {
        first: { value: content, color: '#173177' },
        device: { value: 'test', color: '#173177' },
        time: { value: parseTime(), color: '#173177' },
        remark: { value: 'test', color: '#173177' },
      },
    };
    this.bullService.wxPublicMessageBull.add('wx', postData);
    return 'ok';
  }

  /**
   * 获取微信推送事件记录（分页）
   * v1: POST /api/root/log/wxEvent
   */
  @Post('/events')
  @Role(RoleType.ADMIN, RoleType.ROOT)
  async listEvents(@Body() dto: PaginationReqDto) {
    const query = buildPaginationQuery({ ...dto, allowedSortFields: ['timeStamp', 'createdAt'] });
    const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
    const [items, total] = await Promise.all([
      this.logWxEventService.model.find().sort(sort).skip(query.skip).limit(query.pageSize).lean(),
      query.needTotal ? this.logWxEventService.model.countDocuments() : Promise.resolve(undefined),
    ]);
    return buildPaginatedResult(items, query, total);
  }
}
