import type { RecoveryItem } from '../types';

export interface GroupedItem {
    designation: string;
    type: 'REC' | 'RAL' | 'OUTROS';
    count: number;
}

export function groupItemsByDesignationAndType(items: RecoveryItem[]): GroupedItem[] {
    const groups: Record<string, GroupedItem> = {};

    items.forEach((item) => {
        // Extract Type (REC or RAL) from recoveryNumber (e.g., "REC-565214/2025")
        let type: 'REC' | 'RAL' | 'OUTROS' = 'OUTROS';
        const upperNum = item.recoveryNumber.toUpperCase();

        if (upperNum.startsWith('REC')) {
            type = 'REC';
        } else if (upperNum.startsWith('RAL')) {
            type = 'RAL';
        }

        // Create a unique key for grouping
        const key = `${item.designation}|${type}`;

        if (!groups[key]) {
            groups[key] = {
                designation: item.designation,
                type: type,
                count: 0
            };
        }

        groups[key].count += 1;
    });

    // Convert map to array and sort by Designation
    return Object.values(groups).sort((a, b) => a.designation.localeCompare(b.designation));
}
