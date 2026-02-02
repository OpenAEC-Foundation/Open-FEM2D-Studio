#!/bin/bash
# Dev startup script for the backend solver
cd "$(dirname "$0")"

# ERPNext configuration (read from ~/.mcp.json if available)
if [ -z "$ERPNEXT_URL" ] && command -v python3 &>/dev/null; then
  eval "$(python3 -c "
import json, os
try:
    d = json.load(open(os.path.expanduser('~/.mcp.json')))
    cfg = d.get('mcpServers',{}).get('erpnext',{}).get('env',{})
    for k in ['ERPNEXT_URL','ERPNEXT_API_KEY','ERPNEXT_API_SECRET']:
        if k in cfg:
            print(f'export {k}=\"{cfg[k]}\"')
except: pass
" 2>/dev/null)"
fi

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
