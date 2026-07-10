const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*([\s\S]*?)\s*$/);
    if (match) env[match[1]] = match[2];
});

const { google } = require('googleapis');

// Normalize key – same logic as our server code
let privateKey = env.GOOGLE_PRIVATE_KEY || '';
privateKey = privateKey.trim().replace(/^["']|["']$/g, '').trim();
if (!privateKey.includes('\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
}
privateKey = privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '');
// Ensure header/footer have their own lines
privateKey = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----\s*/g, '-----BEGIN PRIVATE KEY-----\n')
    .replace(/\s*-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----');

console.log('[1] Email:', env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('[2] Key starts with:', privateKey.slice(0, 50));
console.log('[3] Key ends with:', privateKey.slice(-50));
console.log('[4] Key line count:', privateKey.split('\n').length);
console.log('[5] Root folder ID:', env.GOOGLE_DRIVE_FOLDER_ID);

const jwtClient = new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
});

jwtClient.authorize((err, tokens) => {
    if (err) {
        console.error('\n❌ Auth FAILED:', err.message);
        console.error('Code:', err.code);
    } else {
        console.log('\n✅ Auth SUCCESS!');
        
        const drive = google.drive({ version: 'v3', auth: jwtClient });
        drive.files.list({
            q: `'${env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
            pageSize: 5,
            fields: 'files(id,name)'
        }, (err2, res) => {
            if (err2) {
                console.error('❌ Drive list FAILED:', err2.message);
            } else {
                console.log('✅ Drive list SUCCESS!');
                console.log('Files in root:', (res.data.files || []).map(f => f.name));
            }
        });
    }
});
