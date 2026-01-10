#!/bin/bash

echo "🔧 React performance optimization started..."

# 1️⃣ Forsiraj production build
sed -i 's/sourceMap: true/sourceMap: false/g' node_modules/react-scripts/config/webpack.config.js || true

# 2️⃣ Disable console.log u production
find src -type f -name "*.js" -exec sed -i 's/console.log/\/\/console.log/g' {} +

# 3️⃣ Wrap screens in React.memo safely
for file in $(grep -rl "function Screen" src); do
  # dodaj import React ako ne postoji
  if ! grep -q "import React" "$file"; then
    sed -i '1s/^/import React from "react";\n/' "$file"
  fi

  # wrap export default u React.memo ako vec nije
  if ! grep -q "React.memo" "$file"; then
    sed -i 's/export default /export default React.memo(/' "$file"
    # dodaj zatvarajucu zagradu pre kraja fajla (posle poslednje linije)
    echo ")" >> "$file"
  fi
done

# 4️⃣ Hint: map preloads (ovo je samo placeholder, ne menja logiku)
# možeš dodati lazy loading ili pagination kasnije
# find src -type f -name "*.js" -exec sed -i 's/map(/map(/g' {} +

echo "✅ Optimization finished"
