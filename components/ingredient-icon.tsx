import Image from "next/image";

const FALLBACK_ICON = "/icons/ingredients/fallback.svg";

type IngredientIconProps = {
  icon: string | null;
  name: string;
  size?: number;
};

export function IngredientIcon({ icon, name, size = 20 }: IngredientIconProps) {
  const src = icon ? `/icons/ingredients/${icon}` : FALLBACK_ICON;

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      className="inline-block shrink-0"
    />
  );
}
