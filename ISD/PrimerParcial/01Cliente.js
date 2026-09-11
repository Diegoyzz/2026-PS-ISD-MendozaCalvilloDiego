/*
vamos a programar un cliente mediante el cual vamos a probar la arquitectura cliente-servidor por medio de una peticion mediante
 el protocolo http utilizando metodo GET a la ruta : /api/talleres

 Que tenemos que conectarnos al sevidor de la BD
 
 El problema es como apuntar al back

*/
const API_URL = "http://proyectobackcecyt9.onrender.com";

async function main() {
    
    console.log("Cliente Peticion GET -> a " + API_URL + "/api/talleres");

    const inicio = Date.now();
    const respuesta = await fetch(API_URL + "/api/talleres");

    const duracionMs = Date.now() - inicio;

    const cuerpo = await respuesta.json();
    console.log("Ciclo de peticion - respuesta");
    console.log("Protocolo HTTPS sobre TCP: " + respuesta.url);
    console.log("Status de recibido: " + respuesta.status + " " + respuesta.statusText);
    console.log("Tiempo de ida y vuelta (RTT) : " + duracionMs + " ms");
    console.log(JSON.stringify(cuerpo, null, 2));
}

main();

