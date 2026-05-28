#!/bin/bash
# Deploy new V2 controllers to the server workspace
# Run from: /Users/cairui/Code/uart-site-v3

SERVER_DIR="/Users/cairui/Code/midwayuartserver/src/module"

echo "Deploying V2 controllers..."

# Admin WX Controller (new)
cp server-controllers/admin-wx.controller.ts "$SERVER_DIR/wechat/controller/admin-wx.controller.ts"
echo "  ✅ wechat/controller/admin-wx.controller.ts"

# Admin Node Controller (new)
cp server-controllers/admin-node.controller.ts "$SERVER_DIR/realtime/controller/admin-node.controller.ts"
echo "  ✅ realtime/controller/admin-node.controller.ts"

# Admin Device Type Controller (REPLACE existing)
cp server-controllers/admin-device-type-v2.controller.ts "$SERVER_DIR/protocol/controller/admin-device-type.controller.ts"
echo "  ✅ protocol/controller/admin-device-type.controller.ts (replaced with CRUD version)"

echo ""
echo "Done. Restart the server to pick up new routes."
echo ""
echo "New V2 endpoints:"
echo "  --- WX ---"
echo "  POST /api/v2/admin/wx/menu"
echo "  GET  /api/v2/admin/wx/materials?type=&offset=&count="
echo "  GET  /api/v2/admin/wx/users"
echo "  POST /api/v2/admin/wx/users/sync"
echo "  POST /api/v2/admin/wx/send"
echo "  POST /api/v2/admin/wx/events"
echo ""
echo "  --- Nodes ---"
echo "  GET  /api/v2/admin/nodes/:name"
echo "  POST /api/v2/admin/nodes"
echo "  DEL  /api/v2/admin/nodes/:name"
echo ""
echo "  --- Device Types ---"
echo "  POST /api/v2/admin/device-types/list  (existing)"
echo "  GET  /api/v2/admin/device-types/:model (NEW)"
echo "  POST /api/v2/admin/device-types        (NEW)"
echo "  DEL  /api/v2/admin/device-types/:model (NEW)"
echo ""
echo "  --- Still needs server V2 (1 remaining) ---"
echo "  delUserTerminal (admin) → suggest DEL /api/v2/admin/users/:user/bind-devs/:mac"
