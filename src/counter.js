
// Configura un contador interactivo que aumenta al hacer clic en un elemento.
export function setupCounter(element) {

  // Guarda el valor actual del contador.
  let counter = 0;

  // Actualiza el valor del contador y lo muestra en pantalla.
  const setCounter = (count) => {
    counter = count;
    element.innerHTML = `Count is ${counter}`;
  };

  // Aumenta el contador en una unidad cada vez que se hace clic.
  element.addEventListener('click', () => setCounter(counter + 1));

  // Inicializa el contador mostrando el valor cero.
  setCounter(0);
}
