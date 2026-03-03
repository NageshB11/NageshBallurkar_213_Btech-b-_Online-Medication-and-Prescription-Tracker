const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/main/java/com/medical/backend/controller');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // regex to match @PathVariable Type name
    // Examples: @PathVariable Long id
    // @PathVariable String status
    // @PathVariable(name="something") should NOT be matched if it already has parenthesis, 
    // but the regex will look for @PathVariable followed by space.

    // Pattern: @PathVariable\s+([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)
    // Wait, the parameter might be on the next line or have other annotations.
    // Let's use @PathVariable\s+([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)

    const regex = /@PathVariable\s+([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)/g;

    const newContent = content.replace(regex, (match, type, name) => {
        return `@PathVariable("${name}") ${type} ${name}`;
    });

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.java')) {
            fixFile(fullPath);
        }
    }
}

processDirectory(controllersDir);
console.log("Done.");
