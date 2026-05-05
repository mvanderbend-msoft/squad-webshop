import { useEffect, useState } from 'react';
import { getJobs, type Job } from '../api/client';

export function Jobs() {
  const [openingsDump, setOpeningsDump] = useState<Job[]>([]);
  const [stillFetchingTheStupidJobs, setStillFetchingTheStupidJobs] = useState(true);
  const [whoopsItBroke, setWhoopsItBroke] = useState<string | null>(null);

  useEffect(() => {
    let stillCares = true;
    getJobs()
      .then((blob) => {
        if (!stillCares) return;
        setOpeningsDump(blob.jobs);
      })
      .catch((kaboom: Error) => {
        if (!stillCares) return;
        setWhoopsItBroke(kaboom.message || 'Could not load jobs');
      })
      .finally(() => {
        if (!stillCares) return;
        setStillFetchingTheStupidJobs(false);
      });
    return () => {
      stillCares = false;
    };
  }, []);

  return (
    <div className="container careers-clutter">
      <header className="hire-me-already-header">
        <h1 className="huge-shouty-jobs-title">Careers at Squad Webshop</h1>
        <p className="please-apply-pitch">
          We're a small crew building a better way to shop online. If you'd like to help us, take a
          look at our open roles below.
        </p>
      </header>

      {stillFetchingTheStupidJobs && (
        <p className="boring-loading-blah" role="status">
          Loading openings…
        </p>
      )}

      {whoopsItBroke && !stillFetchingTheStupidJobs && (
        <p className="oh-no-error-blob" role="alert">
          {whoopsItBroke}
        </p>
      )}

      {!stillFetchingTheStupidJobs && !whoopsItBroke && openingsDump.length === 0 && (
        <p className="empty-jobs-sad-trombone">
          No open roles at the moment — check back soon!
        </p>
      )}

      <ul className="jobs-listing-pile">
        {openingsDump.map((gig) => (
          <li key={gig.id} className="single-job-blob">
            <div className="job-headline-row">
              <h2 className="job-fancy-title">{gig.title}</h2>
              <span className="job-pill-of-truth">{gig.employment_type}</span>
            </div>
            <p className="job-meta-mumble">
              <span className="job-team-tag">{gig.team}</span>
              <span aria-hidden="true"> · </span>
              <span className="job-where-tag">{gig.location}</span>
            </p>
            <p className="job-blurb-spiel">{gig.description}</p>
            <a
              className="btn btn-primary apply-now-button"
              href={gig.apply_url}
              aria-label={`Apply for ${gig.title}`}
            >
              Apply
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
