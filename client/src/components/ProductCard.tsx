import { Link } from 'react-router-dom';
import type { Product } from '../api/client';
import { FavoriteButton } from './FavoriteButton';

interface Props {
  product: Product;
  onFavoriteToggled?: (productId: number, isFavorited: boolean) => void;
}

export function ProductCard({ product, onFavoriteToggled }: Props) {
  return (
    <div className="card">
      <div className="card-img-wrapper">
        <img
          src={product.image_url}
          alt={product.name}
          className="card-img"
          loading="lazy"
        />
        <FavoriteButton
          productId={product.id}
          isFavorited={product.isFavorited ?? false}
          className="card-favorite"
          onToggled={
            onFavoriteToggled
              ? (next) => onFavoriteToggled(product.id, next)
              : undefined
          }
        />
      </div>
      <div className="card-body">
        <span className="card-category">{product.category.name}</span>
        <h3 className="card-title">{product.name}</h3>
        <p className="card-price">{formatPrice(product.price_cents)}</p>
        <Link to={`/products/${product.id}`} className="btn btn-primary btn-sm">
          View
        </Link>
      </div>
    </div>
  );
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
}
