import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = "postgresql://neondb_owner:npg_dn5zrLZ2aIGA@ep-holy-silence-adi2y5p4-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const client = new Client({ connectionString });

async function run() {
    try {
        await client.connect();
        console.log("Connected to Neon DB!");
        const sqlPath = path.resolve('../database/neon_init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Executing SQL...");
        await client.query(sql);
        console.log("Successfully executed SQL!");
    } catch (err) {
        console.error("Error executing SQL:", err);
    } finally {
        await client.end();
    }
}

run();
