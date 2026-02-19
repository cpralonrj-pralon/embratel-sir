export interface RecoveryItem {
    id: string; // derived from Num.Recup or unique
    priority: number; // Prior.
    points?: number; // Pontos
    recoveryNumber: string; // Num.Recup (e.g., REC-565214/2025)
    client: string; // Cliente
    designation: string; // Designação
    openingDate: string; // Abertura
    executingCF: string; // CF Exec.
    responsible: string; // Resp.
    technician: string; // Técn.
}

export interface FilterState {
    type: string;
    clientName: string;
    segment: string;
    executingCF: string;
    technicianLogin: string;
    startDate: string;
    endDate: string;
    received: boolean;
    hideAssumed: boolean;
    mine: boolean;
    sent: boolean;
}
