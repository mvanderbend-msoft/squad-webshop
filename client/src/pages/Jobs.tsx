import { useEffect, useState } from 'react';
import { getJobs, type Job } from '../api/client';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

export function Jobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getJobs()
      .then((res) => {
        if (cancelled) return;
        setJobs(res.jobs);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="container jobs-page">
      <header className="jobs-header">
        <h1>Careers at Squad Webshop</h1>
        <p className="jobs-intro">
          Help us build the friendliest little webshop on the internet. We're a small, remote-first
          team that values craftsmanship, kindness, and shipping quickly.
        </p>
      </header>

      {loading && <Loading />}

      {error && (
        <div className="jobs-error" role="alert">
          <ErrorBox message={error} />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && jobs && jobs.length === 0 && (
        <p className="jobs-empty">
          No open positions right now — check back soon!
        </p>
      )}

      {!loading && !error && jobs && jobs.length > 0 && (
        <ul className="jobs-list" aria-label="Open positions">
          {jobs.map((job) => (
            <li key={job.id} className="job-card">
              <div className="job-card-header">
                <h2 className="job-title">{job.title}</h2>
                <div className="job-meta">
                  <span className="job-team">{job.team}</span>
                  <span className="job-location">{job.location}</span>
                </div>
              </div>
              <p className="job-description">{job.description}</p>
              <a
                href={job.apply_url}
                className="btn btn-primary btn-sm"
                aria-label={`Apply for ${job.title}`}
              >
                Apply
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
