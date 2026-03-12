-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.14.0.7165
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for smart_home_db
CREATE DATABASE IF NOT EXISTS `smart_home_db` /*!40100 DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci */;
USE `smart_home_db`;

-- Dumping structure for table smart_home_db.devices
CREATE TABLE IF NOT EXISTS `devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `fk_devices_user` (`user_id`),
  CONSTRAINT `fk_devices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table smart_home_db.devices: ~6 rows (approximately)
INSERT INTO `devices` (`id`, `user_id`, `device_name`, `status`) VALUES
	(1, 1, 'ไฟห้องนอน', 0),
	(2, 1, 'ไฟห้องนั่งเล่น', 0),
	(3, 1, 'ไฟหน้าบ้าน', 0),
	(4, 2, 'ไฟห้องนอน', 0),
	(5, 2, 'ไฟห้องน้ำ', 0),
	(6, 2, 'ไฟห้องนั่งเล่น', 0);

-- Dumping structure for table smart_home_db.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Dumping data for table smart_home_db.users: ~2 rows (approximately)
INSERT INTO `users` (`id`, `email`, `password`, `name`) VALUES
	(1, 'suphakit@gmail.com', '$2b$10$OoG3vwHHZMAAXk9TH0u2he3hO/9/vhAN4pa4yZXkJ7oFwYpSSEfKu', 'suphakit'),
	(2, 'phutinont@gmail.com', '$2b$10$RsHpkTx8Es70mwq6wpkD/uhl.CO3CuXKqbXW6U.LCmyHoKpKmMaUe', 'phutinont');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
