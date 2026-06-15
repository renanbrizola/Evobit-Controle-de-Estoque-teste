import { Suspense } from 'react';
import { ProductType } from '../../modules/ficha-tecnica/types/enums';
import { RecipeWorkbench } from '../../modules/ficha-tecnica/components/recipe-workbench';

export default function ProductsPage() {
  return (
    <Suspense>
      <RecipeWorkbench
        productType={ProductType.FINAL}
        heading="Fichas Técnicas"
        description="Crie e gerencie fichas técnicas dos seus produtos com ingredientes, etapas, mão de obra e equipamentos."
      />
    </Suspense>
  );
}
