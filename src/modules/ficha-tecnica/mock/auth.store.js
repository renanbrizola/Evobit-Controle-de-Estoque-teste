export const useAuthStore = (selector) => {
    // Desativando o isDemoSession para usar a API real do Evobit
    const state = {
        isDemoSession: false,
    };
    return selector ? selector(state) : state;
};
