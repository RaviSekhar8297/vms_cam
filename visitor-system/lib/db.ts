import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Ravi%408297@localhost:5432/vms";

const pool = new Pool({
    connectionString,
});

export const db = {
    query: async (text: string, params?: any[]) => {
        try {
            return await pool.query(text, params);
        } catch (error: any) {
            console.error("Database query error:", error.message);
            if (error.message.includes('SASL') || error.message.includes('password')) {
                console.error("-> PostgreSQL Auth failed! Please check DATABASE_URL in the .env file.");
            }
            throw error;
        }
    },
};
