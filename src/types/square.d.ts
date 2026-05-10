declare global {
  interface Window {
    Square: {
      payments: (applicationId: string, locationId: string) => Promise<{
        card: () => Promise<any>;
        tokenize: () => Promise<{ status: string; token?: string; errors?: any[] }>;
      }>;
    };
  }
}

export {};
