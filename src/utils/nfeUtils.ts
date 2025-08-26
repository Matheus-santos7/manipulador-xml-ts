export function calcularDvChave(chave: string): string {
  if (chave.length !== 43) {
    throw new Error("A chave para cálculo do DV deve ter 43 dígitos.");
  }
  let soma = 0;
  let multiplicador = 2;
  for (let i = chave.length - 1; i >= 0; i--) {
    soma += parseInt(chave[i]) * multiplicador;
    multiplicador++;
    if (multiplicador > 9) {
      multiplicador = 2;
    }
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  return (dv === 0 || dv === 1 || dv === 10 || dv === 11) ? '0' : String(dv);
}