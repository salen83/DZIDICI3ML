#!/data/data/com.termux/files/usr/bin/bash

echo "🚀 Starting JS → JSX migration..."

find src -type f -name "*.js" | while read file; do
  echo "➡️ Converting: $file"

  newfile="${file%.js}.jsx"

  # rename file
  mv "$file" "$newfile"

  echo "✅ $file → $newfile"
done

echo "🔥 Done. All src .js files converted to .jsx"
