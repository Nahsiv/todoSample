const express = require('express');
const pool = require('../db/pool');
const { 
    createTaskValidator, 
    patchTaskValidator, 
    getTaskByIdValidator 
  } = require('../validators/taskValidators');
const Joi = require('joi');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
      // Extract user_id from request body (or req.user.id if using auth middleware)
      const { user_id } = req.body;
  
      // Ensure user_id is provided
      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
      }
  
      // Pagination parameters (default: page = 1, size = 10)
      const page = parseInt(req.query.page) || 1; // Default page 1
      const size = parseInt(req.query.size) || 10; // Default size 10
      const offset = (page - 1) * size;
  
      // Dynamic order parameters
      const orderBy = req.query.orderBy || 'priority'; // Default order column: 'priority'
      const orderDirection = req.query.orderDirection === 'asc' ? 'ASC' : 'DESC'; // Default order direction: 'DESC'
  
      // Allow only specific columns to avoid SQL injection
      const validColumns = ['priority', 'start_time', 'end_time', 'title', 'status'];
      if (!validColumns.includes(orderBy)) {
        return res.status(400).json({ error: 'Invalid orderBy column.' });
      }
  
      // Query for tasks with dynamic sorting
      const result = await pool.query(
        `SELECT * 
         FROM tasks 
         WHERE user_id = $1 
         ORDER BY ${orderBy} ${orderDirection} 
         LIMIT $2 OFFSET $3`,
        [user_id, size, offset]
      );
  
      // Response
      res.status(200).json({
        page,
        size,
        total: result.rowCount,
        tasks: result.rows,
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });  

  // create a route that will give us the summary 
  // change it to percentage 
  // pending tasks, 
router.get('/task-stats', async (req, res) => {
  try {
    // Query to get statistics
    const query = `
      WITH task_summary AS (
        SELECT
          COUNT(*) AS total_tasks,
          COUNT(*) FILTER (WHERE status = 'finished') AS tasks_completed,
          COUNT(*) FILTER (WHERE status = 'pending') AS tasks_pending,
          AVG(EXTRACT(EPOCH FROM (end_time - start_time))) AS avg_time_seconds
        FROM tasks
      )
      SELECT
        total_tasks,
        tasks_completed,
        tasks_pending,
        COALESCE(avg_time_seconds, 0) AS avg_time_seconds
      FROM task_summary;
    `;

    // Execute the query
    const result = await pool.query(query);

    // Extract data
    const stats = result.rows[0];

    // Send response
    res.json({
      totalTasks: stats.total_tasks,
      tasksCompletedPercentage: `${((stats.tasks_completed / stats.total_tasks) * 100).toFixed(2)} %`,
      tasksPendingPercentage: `${((stats.tasks_pending / stats.total_tasks) * 100).toFixed(2)} %`,
      averageTimePerCompletedTask: `${(stats.avg_time_seconds / 60).toFixed(2)} hrs`
    });
    
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

router.get('/pending-tasks', async (req, res) => {
  try {
    const query = `
      WITH pending_aggregate AS (
        SELECT
          COUNT(*) AS pending_tasks_count,
          SUM(EXTRACT(EPOCH FROM (NOW() - start_time))) AS total_time_lapsed_seconds,
          SUM(EXTRACT(EPOCH FROM (end_time - start_time))) AS total_estimated_time_seconds
        FROM tasks
        WHERE status = 'pending'
      )
      SELECT
        pending_tasks_count,
        COALESCE(total_time_lapsed_seconds, 0) / 3600 AS total_time_lapsed_hours,
        COALESCE(total_estimated_time_seconds, 0) / 3600 AS total_estimated_time_hours
      FROM pending_aggregate;
    `;

    // Execute the query
    const result = await pool.query(query);

    // Extract data
    const stats = result.rows[0];

    // Send response
    res.json({
      pendingTasksCount: stats.pending_tasks_count,
      totalTimeLapsedHours: stats.total_time_lapsed_hours,
      totalEstimatedTimeHours: stats.total_estimated_time_hours
    });
  } catch (error) {
    console.error('Error fetching pending tasks aggregate data:', error);
    res.status(500).json({ error: 'Failed to fetch pending tasks data' });
  }
});


router.get('/tasks-by-priority', async (req, res) => {
  try {
    const query = `
      WITH priority_summary AS (
        SELECT
          priority,
          COUNT(*) AS total_tasks,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
          SUM(EXTRACT(EPOCH FROM (NOW() - start_time))) FILTER (WHERE status = 'pending') AS total_time_lapsed_seconds,
          SUM(EXTRACT(EPOCH FROM (end_time - start_time))) FILTER (WHERE status = 'pending') AS total_estimated_time_seconds
        FROM tasks
        GROUP BY priority
      )
      SELECT
        priority,
        total_tasks,
        pending_tasks,
        COALESCE(total_time_lapsed_seconds, 0) / 3600 AS total_time_lapsed_hours,
        COALESCE(total_estimated_time_seconds, 0) / 3600 AS total_estimated_time_hours
      FROM priority_summary
      ORDER BY priority;
    `;

    const result = await pool.query(query);

    const priorities = result.rows.map(row => ({
      priority: row.priority,
      totalTasks: row.total_tasks,
      pendingTasks: row.pending_tasks,
      totalTimeLapsedHours: row.total_time_lapsed_hours,
      totalEstimatedTimeHours: row.total_estimated_time_hours
    }));

    res.json({
      tasksByPriority: priorities
    });
  } catch (error) {
    console.error('Error fetching tasks by priority:', error);
    res.status(500).json({ error: 'Failed to fetch tasks grouped by priority' });
  }
});




router.post('/', async (req, res) => {

  const { error } = createTaskValidator.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { title, priority, status, start_time, end_time, user_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, priority, status, start_time, end_time, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, priority, status, start_time, end_time, user_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).send('Server error');
  }
});

router.patch('/:id', async (req, res) => {
  const { error: error1 } = getTaskByIdValidator.validate(req.params);
  if (error1) {
    return res.status(400).json({ message: error1.details[0].message });
  }

  // Validate the 'body' of the request
  const { error: error2 } = patchTaskValidator.validate(req.body);
  if (error2) {
    return res.status(400).json({ message: error2.details[0].message });
  }

  const { id } = req.params;
  const fieldsToUpdate = ['title', 'priority', 'status', 'start_time', 'end_time'];
  
  // Filter out fields that are undefined (not provided in the request)
  const updates = fieldsToUpdate
    .filter(field => req.body[field] !== undefined)  // Only keep fields that are provided
    .map((field, index) => `${field} = $${index + 1}`); // Map to SQL query format
  
  if (updates.length === 0) {
    return res.status(400).send('No fields to update');
  }

  // Construct the dynamic SQL query
  const updateQuery = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${updates.length + 1} RETURNING *`;

  // Collect the values to pass to the query
  const values = [...fieldsToUpdate.filter(field => req.body[field] !== undefined).map(field => req.body[field]), id];

  try {
    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).send('Task not found');
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).send('Server error');
  }
});

router.delete('/:id', async (req, res) => {
  const { error } = getTaskByIdValidator.validate(req.params);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Task not found');
    }
    res.status(200).send('Task deleted successfully');
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
