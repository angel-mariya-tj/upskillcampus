import app from './app';
import pool from './config/db';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Check DB connection
    const res = await pool.query('SELECT NOW()');
    console.log('Database connection verified at:', res.rows[0].now);

    const server = app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        pool.end().then(() => {
          console.log('Database pool closed.');
          process.exit(0);
        });
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to connect to the database or start server:', error);
    process.exit(1);
  }
};

startServer();
