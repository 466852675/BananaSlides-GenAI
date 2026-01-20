export const formatTemplateId = (id: string, createdAt: number | string | Date) => {
    try {
        // 1. Get Date String (YYMMDD)
        const dateObj = new Date(createdAt);
        // If date is invalid, fallback
        if (isNaN(dateObj.getTime())) return id;

        const year = dateObj.getFullYear().toString().slice(-2);
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        const dateStr = `${year}${month}${day}`;

        // 2. Get Hex Fragment (Last 6 chars of UUID to avoid too many dashes)
        // Standard UUID: 8-4-4-4-12
        // We take the first 6 chars of the LAST segment (node) for uniqueness + brevity,
        // OR just the first 6 chars of the ID if it's not a standard UUID structure.
        const hexFragment = id.replace(/-/g, '').slice(-6).toUpperCase();

        return `TID-${dateStr}-${hexFragment}`;
    } catch (e) {
        return id;
    }
};
