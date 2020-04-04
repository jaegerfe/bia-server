export const setSession = (state, session) => {
  state.user = session.user;
  state.account = session.account;
}

export const setLoading = (state, loading) => {
  if (loading) {
    state.loading++;
  } else {
    state.loading--;
  }
  // balance
  if (state.loading < 0) {
    state.loading = 0;
  }
}