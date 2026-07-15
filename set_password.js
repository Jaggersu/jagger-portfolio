const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) {
        console.error("Error fetching users", fetchError);
        return;
    }
    const adminUser = users.users.find(u => u.email === 'jaggersu@gmail.com');
    if (!adminUser) {
        console.error("Admin user not found");
        return;
    }
    const { data, error } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { password: 'jaggersuadmin' }
    );
    console.log("Password updated", error || "Success");
}

run();
