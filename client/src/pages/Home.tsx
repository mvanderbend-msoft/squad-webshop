import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProducts, getCategories } from '../api/client';
import type { Product, Category } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  const categoryFilter = searchParams.get('category') ?? '';
  const qFilter = searchParams.get('q') ?? '';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { products: p } = await getProducts({
        category: categoryFilter || undefined,
        q: qFilter || undefined,
      });
      setProducts(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, qFilter]);

  useEffect(() => {
    getCategories()
      .then(({ categories: c }) => setCategories(c))
      .catch(() => {/* ignore */});
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  function handleCategoryClick(slug: string) {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('category', slug);
    else next.delete('category');
    next.delete('q');
    setSearchInput('');
    setSearchParams(next);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set('q', searchInput.trim());
    else next.delete('q');
    setSearchParams(next);
  }

  return (
    <div className="container page-home">
      <aside className="sidebar">
        <h2 className="sidebar-title">Categories</h2>
        <ul className="category-list">
          <li>
            <button
              className={`category-btn${!categoryFilter ? ' active' : ''}`}
              onClick={() => handleCategoryClick('')}
            >
              All
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                className={`category-btn${categoryFilter === cat.slug ? ' active' : ''}`}
                onClick={() => handleCategoryClick(cat.slug)}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="products-main">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            className="search-input"
            type="search"
            placeholder="Search products…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
          {(qFilter || categoryFilter) && (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearchParams({});
              }}
            >
              Clear
            </button>
          )}
        </form>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} />
        ) : products.length === 0 ? (
          <p className="empty-state">No products found.</p>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
