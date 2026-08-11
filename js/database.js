// js/db.js
// Configuracion de Supabase para la base de datos en la nube

const SUPABASE_URL = 'https://eoazxjqemimzsefldfms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvYXp4anFlbWltenNlZmxkZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjY4ODcsImV4cCI6MjEwMTY0Mjg4N30.gxQsH8F9-zK_01xOt8CMquSPp59rZeaFOjuvhONGA2c';

let supabaseClient;
try {
    // Para UMD builds, a veces se exporta como 'supabase'
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    } else {
        console.error("La libreria Supabase no se cargo correctamente.");
    }
} catch (e) {
    console.error("Error al inicializar Supabase:", e);
}

// Helpers para convertir camelCase a snake_case y viceversa
function toSnake(obj) {
    if (!obj) return obj;
    const res = {};
    for (const k in obj) {
        const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        res[snake] = obj[k];
    }
    return res;
}

function toCamel(obj) {
    if (!obj) return obj;
    const res = {};
    for (const k in obj) {
        const camel = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        res[camel] = obj[k];
    }
    return res;
}

// Emulador de la API de Dexie.js conectada a Supabase
const db = {
    products: {
        async count() {
            if (!supabaseClient) return 0;
            try {
                const { count, error } = await supabaseClient.from('products').select('*', { count: 'exact', head: true });
                if (error) {
                    console.error("Supabase Error en count:", error);
                    return 0;
                }
                return count || 0;
            } catch (err) {
                console.error("Fetch Error en count:", err);
                return 0;
            }
        },
        async clear() {},
        async toArray() {
            if (!supabaseClient) return [];
            try {
                const { data, error } = await supabaseClient.from('products').select('*').order('id', { ascending: true });
                if (error) throw error;
                return data.map(toCamel);
            } catch (err) {
                console.error("Error toArray products", err);
                return [];
            }
        },
        async add(p) {
            if (!supabaseClient) throw new Error("Supabase no inicializado");
            const { data, error } = await supabaseClient.from('products').insert([toSnake(p)]).select('id').single();
            if (error) throw error;
            return data.id;
        },
        async get(id) {
            if (!supabaseClient) return null;
            const { data, error } = await supabaseClient.from('products').select('*').eq('id', id).single();
            if (error) throw error;
            return toCamel(data);
        },
        async update(id, updates) {
            if (!supabaseClient) return;
            const snakeObj = toSnake(updates);
            const { error } = await supabaseClient.from('products').update(snakeObj).eq('id', id);
            if (error) throw error;
        }
    },
    variants: {
        async clear() {},
        async toArray() {
            if (!supabaseClient) return [];
            try {
                const { data, error } = await supabaseClient.from('variants').select('*');
                if (error) throw error;
                return data.map(toCamel);
            } catch (err) {
                console.error("Error toArray variants", err);
                return [];
            }
        },
        async get(id) {
            if (!supabaseClient) return null;
            const { data, error } = await supabaseClient.from('variants').select('*').eq('id', id).single();
            if (error) throw error;
            return toCamel(data);
        },
        async put(v) {
            if (!supabaseClient) return;
            const snakeObj = toSnake(v);
            delete snakeObj.id; // Evitar actualizar ID
            const { error } = await supabaseClient.from('variants').update(snakeObj).eq('id', v.id);
            if (error) throw error;
        },
        async add(v) {
            if (!supabaseClient) throw new Error("Supabase no inicializado");
            const { data, error } = await supabaseClient.from('variants').insert([toSnake(v)]).select('id').single();
            if (error) throw error;
            return data.id;
        }
    },
    transactions: {
        async clear() {},
        async toArray() {
            if (!supabaseClient) return [];
            try {
                const { data, error } = await supabaseClient.from('transactions').select('*').order('date', { ascending: true });
                if (error) throw error;
                return data.map(toCamel);
            } catch (err) {
                return [];
            }
        },
        async add(t) {
            if (!supabaseClient) throw new Error("Supabase no inicializado");
            const { data, error } = await supabaseClient.from('transactions').insert([toSnake(t)]).select('id').single();
            if (error) throw error;
            return data.id;
        },
        orderBy(field) {
            const snakeField = field === 'userId' ? 'user_id' : (field === 'variantId' ? 'variant_id' : field);
            return {
                reverse() {
                    return {
                        async toArray() {
                            if (!supabaseClient) return [];
                            try {
                                const { data, error } = await supabaseClient.from('transactions').select('*').order(snakeField, { ascending: false });
                                if (error) throw error;
                                return data.map(toCamel);
                            } catch (err) {
                                return [];
                            }
                        }
                    }
                }
            }
        }
    },
    audits: {
        async clear() {},
        async add(a) {
            if (!supabaseClient) throw new Error("Supabase no inicializado");
            const { data, error } = await supabaseClient.from('audits').insert([toSnake(a)]).select('id').single();
            if (error) throw error;
            return data.id;
        },
        orderBy(field) {
            const snakeField = field === 'userId' ? 'user_id' : field;
            return {
                reverse() {
                    return {
                        async toArray() {
                            if (!supabaseClient) return [];
                            try {
                                const { data, error } = await supabaseClient.from('audits').select('*').order(snakeField, { ascending: false });
                                if (error) throw error;
                                return data.map(toCamel);
                            } catch(err) {
                                return [];
                            }
                        }
                    }
                }
            }
        }
    },
    async transaction(mode, t1, t2, fn) {
        return await fn();
    }
};

async function initDB() {
    try {
        const count = await db.products.count();
        if (count === 0 && supabaseClient) {
            console.warn("Base de datos vacia o vaciada.");
        }
        
        // Disparar un evento para que app.js u otros sepan que fallo si es el caso
        if (!supabaseClient) {
            if (window.showToast) window.showToast("Error de conexion a BD", "error");
        }
    } catch (err) {
        console.error("Error en initDB:", err);
    }
}

// Queries comunes
async function getFullVariants() {
    if (!supabaseClient) return [];
    try {
        const { data: productsData, error: pErr } = await supabaseClient.from('products').select('*');
        if (pErr) throw pErr;

        const productMap = {};
        productsData.forEach(p => productMap[p.id] = toCamel(p));
        
        let variantsData = [];
        let start = 0;
        const step = 500; // Increased to 500 now that images are compressed, loads instantly
        while (true) {
            const { data, error: vErr } = await supabaseClient.from('variants').select('*').range(start, start + step - 1);
            if (vErr) throw vErr;
            if (!data || data.length === 0) break;
            variantsData = variantsData.concat(data);
            if (data.length < step) break;
            start += step;
        }

        return variantsData.map(v => {
            const camelV = toCamel(v);
            return Object.assign({}, camelV, {
                product: productMap[camelV.productId] || {}
            });
        });
    } catch (err) {
        console.error("Error en getFullVariants", err);
        return [];
    }
}

window.db = db;
window.initDB = initDB;
window.getFullVariants = getFullVariants;
