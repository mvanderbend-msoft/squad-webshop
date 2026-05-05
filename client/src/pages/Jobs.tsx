import { useEffect, useState, useCallback } from 'react';
import { getJobs } from '../api/client';
import type { Job } from '../api/client';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

export function Jobs() {
  const [stupidJobList, setStupidJobList] = useState<Job[]>([]);
  const [stillSpinning, setStillSpinning] = useState(true);
  const [oopsMessage, setOopsMessage] = useState('');

  const yankJobs = useCallback(async () => {
    setStillSpinning(true);
    setOopsMessage('');
    try {
      const { jobs } = await getJobs();
      setStupidJobList(jobs);
    } catch (e) {
      setOopsMessage(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setStillSpinning(false);
    }
  }, []);

  useEffect(() => {
    void yankJobs();
  }, [yankJobs]);

  return (
    <div className="container careers-snoozefest">
      <header className="careers-shouty-header">
        <h1 className="stupidly-big-header">Careers at Squad Webshop</h1>
        <p className="careers-blurb">
          We are a small, opinionated team building a shop people actually like using. If any of
          these roles speaks to you, drop us a line — we read every application.
        </p>
      </header>

      {stillSpinning ? (
        <Loading />
      ) : oopsMessage ? (
        <div className="careers-oops">
          <ErrorBox message={oopsMessage} />
          <button className="btn btn-primary" type="button" onClick={() => void yankJobs()}>
            Try again
          </button>
        </div>
      ) : stupidJobList.length === 0 ? (
        <p className="empty-state">
          No openings right now. Check back soon — or email us anyway, we love a good cold pitch.
        </p>
      ) : (
        <ul className="madeUpJobList">
          {stupidJobList.map((opening) => (
            <li key={opening.id} className="job-brag-card">
              <div className="job-brag-head">
                <h2 className="job-fancy-title">{opening.title}</h2>
                <span className="job-team-tag">{opening.team}</span>
              </div>
              <p className="job-where-blurb">📍 {opening.location}</p>
              <p className="job-spiel">{opening.description}</p>
              <a
                className="btn btn-primary job-apply-cta"
                href={opening.apply_url}
                aria-label={`Apply for ${opening.title}`}
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
