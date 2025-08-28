import React from "react";
import PrivateLayout from "../component/privateLayout";
import ListaCategoria from "../component/listaCategoria";

export const ListaCat = () => {
  return (
    <PrivateLayout>
      <div className="text-center mt-5">
        <h1 className="mb-4">Categorías</h1>
        <ListaCategoria />
      </div>
    </PrivateLayout>
  );
};
