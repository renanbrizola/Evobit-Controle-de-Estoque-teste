export const useAuthStore = (selector) => {
    // Forçar isDemoSession para carregar os mocks visuais
    const state = {
        isDemoSession: true,
    };
    return selector ? selector(state) : state;
};
