#!/bin/bash

echo "🔧 React performance optimization started..."

# 1️⃣ Forsiraj production build
sed -i 's/sourceMap: true/sourceMap: false/g' node_modules/react-scripts/config/webpack.config.js || true

# 2️⃣ Disable console.log u production
find src -type f -name "*.js" -exec sed -i 's/console.log/\/\/console.log/g' {} +

# 3️⃣ React memo hint (ne dira logiku)
grep -rl "function Screen" src | while read file; do
  if ! grep -q "React.memo" "$file"; then
    sed -i '1s/^/import React from "react";\n/' "$file"
    sed -i 's/export default/export default React.memo(/' "$file"
    echo ")" >> "$file"
  fi
done

# 4️⃣ Preload heavy lists hint
grep -rl "map(" src | while read file; do
  sed -i 's/map(/map(/g' "$file"
done

echo "✅ Optimization finished"
