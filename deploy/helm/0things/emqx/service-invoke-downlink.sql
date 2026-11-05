SELECT
  value AS payload,
  json_decode(value) AS command
FROM "$sources/kafka_consumer:service_invoke_commands"

