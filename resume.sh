#!/bin/bash
cd /workspaces/DZIDICI3ML
echo "Uptime:"
uptime
echo "Node:"
node -v
echo "Running apps:"
ps aux | grep serve | grep -v grep
